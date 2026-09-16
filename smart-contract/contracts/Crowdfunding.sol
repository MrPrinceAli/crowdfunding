// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.24;

import "./Project.sol";

/**
 * @title Crowdfunding
 * @notice Registry kampanye: membuat kampanye baru, meneruskan donasi ke contract Project,
 *         laporan kampanye mencurigakan, badge terverifikasi & takedown oleh admin (akun deployer),
 *         banding takedown, serta nama profil pengguna.
 *
 * Banding: penggalang dana dapat mengajukan banding SATU KALI paling lambat APPEAL_PERIOD setelah
 * takedown. Jika diterima admin, label takedown dicabut (nama baik pulih & tampil lagi di daftar),
 * tetapi kampanye tetap dibatalkan dan refund donatur tetap terbuka.
 */
contract Crowdfunding {
    uint256 public constant MAX_TITLE_LENGTH = 120;
    uint256 public constant MAX_TEXT_LENGTH = 1000;
    uint256 public constant MAX_URL_LENGTH = 500;
    uint256 public constant MAX_MESSAGE_LENGTH = 280;
    uint256 public constant MAX_NAME_LENGTH = 32;
    uint256 public constant MAX_LOCATION_LENGTH = 64;
    uint256 public constant APPEAL_PERIOD = 14 days;

    enum AppealStatus {
        None,
        Pending,
        Accepted,
        Rejected
    }

    /// Admin platform = akun yang men-deploy contract
    address public immutable owner;

    Project[] private projects;

    /// Hanya project yang dibuat lewat platform ini yang bisa menerima donasi
    mapping(address => bool) public isProject;
    mapping(address => bool) public isVerified;
    mapping(address => uint256) public reportCount;
    mapping(address => mapping(address => bool)) public hasReported;
    mapping(address => bool) public isTakenDown;
    mapping(address => uint256) public takenDownAt;
    mapping(address => AppealStatus) public appealStatus;
    /// Nama tampilan pilihan pengguna (kosong = tidak ada); tidak unik, jadi alamat tetap ditampilkan
    mapping(address => string) public displayName;

    event ProjectCreated(
        address indexed projectAddress,
        address indexed creator,
        uint256 minContribution,
        uint256 projectDeadline,
        uint256 goalAmount,
        string title,
        string description,
        string category,
        string imageUrl,
        string location
    );
    event ContributionReceived(
        address indexed projectAddress,
        uint256 amount,
        address indexed contributor,
        string message
    );
    event ProjectVerified(address indexed projectAddress, bool verified);
    event ProjectTakenDown(address indexed projectAddress, string reason);
    event TakedownAppealed(address indexed projectAddress, string reason);
    event AppealResolved(address indexed projectAddress, bool accepted, string note);
    event DisplayNameChanged(address indexed account, string name);
    event ProjectReported(
        address indexed projectAddress,
        address reporter,
        string reason,
        uint256 reportCount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only admin can perform this action");
        _;
    }

    modifier onlyProject(address _projectAddress) {
        require(isProject[_projectAddress], "Project not found");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createProject(
        uint256 _minimumContribution,
        uint256 _deadline,
        uint256 _targetContribution,
        string memory _title,
        string memory _description,
        string memory _category,
        string memory _imageUrl,
        string memory _location
    ) external {
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(_minimumContribution > 0, "Minimum contribution must be greater than 0");
        require(_targetContribution > 0, "Target contribution must be greater than 0");
        require(_minimumContribution <= _targetContribution, "Minimum contribution cannot exceed target");
        require(bytes(_title).length > 0, "Title is required");
        require(bytes(_title).length <= MAX_TITLE_LENGTH, "Title is too long");
        require(bytes(_description).length <= MAX_TEXT_LENGTH, "Description is too long");
        require(bytes(_category).length > 0, "Category is required");
        require(bytes(_imageUrl).length <= MAX_URL_LENGTH, "Image URL is too long");
        require(bytes(_location).length <= MAX_LOCATION_LENGTH, "Location is too long");

        Project project = new Project(
            msg.sender,
            _minimumContribution,
            _deadline,
            _targetContribution,
            _title,
            _description,
            _category,
            _imageUrl,
            _location
        );
        projects.push(project);
        isProject[address(project)] = true;

        emit ProjectCreated(
            address(project),
            msg.sender,
            _minimumContribution,
            _deadline,
            _targetContribution,
            _title,
            _description,
            _category,
            _imageUrl,
            _location
        );
    }

    function getAllProjects() external view returns (Project[] memory) {
        return projects;
    }

    /// @notice Donasi ke kampanye dengan pesan dukungan opsional;
    ///         validasi minimum donasi & deadline dilakukan di contract Project
    function contribute(
        address _projectAddress,
        string calldata _message
    ) external payable onlyProject(_projectAddress) {
        emit ContributionReceived(_projectAddress, msg.value, msg.sender, _message);
        Project(_projectAddress).contribute{value: msg.value}(msg.sender, _message);
    }

    // ---------------------------------------------------------------------
    // Moderasi
    // ---------------------------------------------------------------------

    /// @notice Admin memberi atau mencabut badge terverifikasi
    function setVerified(
        address _projectAddress,
        bool _verified
    ) external onlyOwner onlyProject(_projectAddress) {
        isVerified[_projectAddress] = _verified;
        emit ProjectVerified(_projectAddress, _verified);
    }

    /// @notice Siapa pun (kecuali pembuatnya) bisa melaporkan kampanye mencurigakan, satu kali per akun
    function reportProject(
        address _projectAddress,
        string memory _reason
    ) external onlyProject(_projectAddress) {
        require(msg.sender != Project(_projectAddress).creator(), "Creator cannot report own project");
        require(!hasReported[_projectAddress][msg.sender], "You already reported this project");
        require(bytes(_reason).length > 0, "Report reason is required");
        require(bytes(_reason).length <= MAX_TEXT_LENGTH, "Report reason is too long");

        hasReported[_projectAddress][msg.sender] = true;
        reportCount[_projectAddress]++;

        emit ProjectReported(_projectAddress, msg.sender, _reason, reportCount[_projectAddress]);
    }

    /// @notice Admin menghentikan kampanye bermasalah: dibatalkan permanen & donatur dapat refund
    function takedownProject(
        address _projectAddress,
        string calldata _reason
    ) external onlyOwner onlyProject(_projectAddress) {
        isTakenDown[_projectAddress] = true;
        takenDownAt[_projectAddress] = block.timestamp;
        if (isVerified[_projectAddress]) {
            isVerified[_projectAddress] = false;
            emit ProjectVerified(_projectAddress, false);
        }
        emit ProjectTakenDown(_projectAddress, _reason);
        Project(_projectAddress).takedown(_reason);
    }

    /// @notice Penggalang dana mengajukan banding atas takedown (satu kali, maks. APPEAL_PERIOD)
    function appealTakedown(
        address _projectAddress,
        string calldata _reason
    ) external onlyProject(_projectAddress) {
        require(msg.sender == Project(_projectAddress).creator(), "Only creator can appeal");
        require(isTakenDown[_projectAddress], "Project is not taken down");
        require(appealStatus[_projectAddress] == AppealStatus.None, "Appeal already submitted");
        require(block.timestamp <= takenDownAt[_projectAddress] + APPEAL_PERIOD, "Appeal period has ended");
        require(bytes(_reason).length > 0, "Appeal reason is required");
        require(bytes(_reason).length <= MAX_TEXT_LENGTH, "Appeal reason is too long");

        appealStatus[_projectAddress] = AppealStatus.Pending;
        emit TakedownAppealed(_projectAddress, _reason);
    }

    /// @notice Admin menerima (label takedown dicabut) atau menolak banding, beserta catatan publik
    function resolveAppeal(
        address _projectAddress,
        bool _accepted,
        string calldata _note
    ) external onlyOwner onlyProject(_projectAddress) {
        require(appealStatus[_projectAddress] == AppealStatus.Pending, "No pending appeal");
        require(bytes(_note).length > 0, "Decision note is required");
        require(bytes(_note).length <= MAX_TEXT_LENGTH, "Decision note is too long");

        appealStatus[_projectAddress] = _accepted ? AppealStatus.Accepted : AppealStatus.Rejected;
        // Kampanye tetap dibatalkan & refund tetap terbuka; hanya label takedown yang dicabut
        if (_accepted) isTakenDown[_projectAddress] = false;
        emit AppealResolved(_projectAddress, _accepted, _note);
    }

    // ---------------------------------------------------------------------
    // Profil
    // ---------------------------------------------------------------------

    /// @notice Atur nama tampilan (maks. MAX_NAME_LENGTH byte); string kosong menghapus nama
    function setDisplayName(string calldata _name) external {
        require(bytes(_name).length <= MAX_NAME_LENGTH, "Name is too long");
        displayName[msg.sender] = _name;
        emit DisplayNameChanged(msg.sender, _name);
    }
}

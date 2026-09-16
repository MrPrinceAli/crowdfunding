// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.24;

/**
 * @title Project
 * @notice Satu kampanye crowdfunding dengan model keep-it-all: dana yang terkumpul boleh ditarik
 *         penggalang dana berapa pun jumlahnya (tidak harus mencapai target), selama permintaan
 *         penarikan disetujui donatur.
 *
 * Aturan persetujuan permintaan penarikan (dihitung dari donatur yang sudah berdonasi
 * SEBELUM permintaan dibuat, agar donatur baru tidak bisa mengubah keputusan):
 * - Setuju > 50% pemilih yang berhak -> langsung disetujui
 * - Tolak  > 50% pemilih yang berhak -> langsung ditolak
 * - Setelah VOTING_PERIOD lewat: disetujui jika jumlah pemilih >= QUORUM_PERCENT pemilih yang berhak
 *   dan suara setuju > suara tolak; selain itu ditolak.
 *
 * Dana terbengkalai: jika penggalang dana tidak mengajukan/menarik dana selama ABANDON_PERIOD
 * setelah deadline (atau setelah aktivitas terakhirnya), donatur dapat menarik kembali sisa dana
 * secara proporsional terhadap donasinya.
 *
 * Penggalang dana dapat mengedit deskripsi, kategori, lokasi (provinsi), dan gambar selama kampanye berjalan
 * (judul, target, dan donasi minimum tidak bisa diubah), memperpanjang deadline satu kali
 * maksimal MAX_EXTENSION jika target belum tercapai, dan menutup donasi lebih awal.
 *
 * Pembatalan: penggalang dana (kapan saja) atau admin lewat takedown dapat membatalkan kampanye.
 * Donasi & penarikan dihentikan, pengajuan yang belum ditarik batal, dan donatur dapat menarik
 * kembali sisa dana secara proporsional (mekanisme yang sama dengan dana terbengkalai).
 */
contract Project {
    /// Fundraising = berjalan & target belum tercapai, Expired = deadline lewat & target tidak tercapai,
    /// Successful = target tercapai
    enum State {
        Fundraising,
        Expired,
        Successful
    }

    enum Vote {
        None,
        Approve,
        Reject
    }

    enum RequestStatus {
        Voting,
        Approved,
        Rejected,
        Completed,
        Cancelled
    }

    struct WithdrawRequest {
        string description;
        uint256 amount;
        address payable recipient;
        uint256 approvalCount;
        uint256 rejectionCount;
        uint256 votingDeadline;
        /// Jumlah donatur saat permintaan dibuat; hanya mereka yang boleh voting
        uint256 eligibleVoterCount;
        bool isCompleted;
        bool isCancelled;
        mapping(address => Vote) votes;
    }

    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant QUORUM_PERCENT = 20;
    uint256 public constant ABANDON_PERIOD = 30 days;
    uint256 public constant MAX_TEXT_LENGTH = 1000;
    uint256 public constant MAX_MESSAGE_LENGTH = 280;
    uint256 public constant MAX_URL_LENGTH = 500;
    uint256 public constant MAX_LOCATION_LENGTH = 64;
    uint256 public constant MAX_EXTENSION = 30 days;

    /// Contract Crowdfunding yang membuat project ini (satu-satunya yang boleh meneruskan donasi)
    address public immutable crowdfunding;
    address payable public immutable creator;

    uint256 public immutable minimumContribution;
    /// UNIX timestamp dalam detik, dibandingkan dengan block.timestamp
    uint256 public deadline;
    bool public deadlineExtended;
    uint256 public immutable targetContribution;
    string public projectTitle;
    string public projectDescription;
    string public category;
    string public imageUrl;
    /// Provinsi kampanye (mis. "Jawa Barat", "Nasional", "Luar Negeri")
    string public location;

    State public state = State.Fundraising;
    uint256 public completedAt;
    uint256 public raisedAmount;
    uint256 public contributorCount;
    mapping(address => uint256) public contributions;
    /// Urutan donatur (mulai dari 1) berdasarkan donasi pertamanya; 0 = bukan donatur
    mapping(address => uint256) public contributorIndex;

    mapping(uint256 => WithdrawRequest) public withdrawRequests;
    uint256 public withdrawRequestCount;
    /// Total dana yang sedang diajukan (belum ditarik), agar pengajuan tidak melebihi saldo
    uint256 public pendingWithdrawAmount;
    /// Waktu terakhir penggalang dana mengajukan atau menarik dana
    uint256 public lastCreatorActivity;

    uint256 public updateCount;

    bool public closedEarly;
    bool public isCancelled;
    /// true jika dibatalkan admin (takedown), false jika dibatalkan penggalang dana
    bool public cancelledByAdmin;
    uint256 public cancelledAt;

    /// Saldo yang dibagikan ke donatur saat refund dibuka (diset saat klaim pertama)
    uint256 public refundPool;
    mapping(address => bool) public refundClaimed;

    event FundingReceived(address indexed contributor, uint256 amount, uint256 currentTotal, string message);
    event CampaignEdited(
        string description,
        string category,
        string imageUrl,
        string location,
        uint256 editedAt
    );
    event DeadlineExtended(uint256 previousDeadline, uint256 newDeadline);
    event FundingClosed(uint256 previousDeadline, uint256 closedAt);
    event ProjectCancelled(bool byAdmin, string reason, uint256 cancelledAt);
    event WithdrawRequestCreated(
        uint256 requestId,
        string description,
        uint256 amount,
        address indexed recipient,
        uint256 votingDeadline
    );
    event WithdrawRequestApproved(uint256 requestId, address indexed voter, uint256 approvalCount);
    event WithdrawRequestRejected(uint256 requestId, address indexed voter, uint256 rejectionCount);
    event WithdrawRequestCancelled(uint256 requestId, uint256 amount);
    event WithdrawCompleted(
        uint256 requestId,
        string description,
        uint256 amount,
        uint256 approvalCount,
        address indexed recipient
    );
    event ProjectUpdatePosted(uint256 updateId, string message, uint256 postedAt);
    event RefundClaimed(address indexed contributor, uint256 amount);

    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator can perform this action");
        _;
    }

    modifier onlyCrowdfunding() {
        require(msg.sender == crowdfunding, "Contribute only through Crowdfunding contract");
        _;
    }

    modifier beforeDeadline() {
        require(block.timestamp < deadline, "Deadline has passed");
        _;
    }

    modifier notAbandoned() {
        require(!isAbandoned(), "Project funds are abandoned");
        _;
    }

    modifier notCancelled() {
        require(!isCancelled, "Project is cancelled");
        _;
    }

    constructor(
        address _creator,
        uint256 _minimumContribution,
        uint256 _deadline,
        uint256 _targetContribution,
        string memory _projectTitle,
        string memory _projectDescription,
        string memory _category,
        string memory _imageUrl,
        string memory _location
    ) {
        require(_creator != address(0), "Invalid creator address");
        crowdfunding = msg.sender;
        creator = payable(_creator);
        minimumContribution = _minimumContribution;
        deadline = _deadline;
        targetContribution = _targetContribution;
        projectTitle = _projectTitle;
        projectDescription = _projectDescription;
        category = _category;
        imageUrl = _imageUrl;
        location = _location;
    }

    // ---------------------------------------------------------------------
    // Donasi
    // ---------------------------------------------------------------------

    /// @notice Donasi dibuka sampai deadline, termasuk setelah target tercapai
    function contribute(
        address _contributor,
        string calldata _message
    ) external payable onlyCrowdfunding beforeDeadline {
        require(msg.value > 0 && msg.value >= minimumContribution, "Contribution amount is too low");
        require(bytes(_message).length <= MAX_MESSAGE_LENGTH, "Message is too long");
        // Pembuat kampanye tidak boleh berdonasi, agar tidak bisa memberi suara untuk penarikannya sendiri
        require(_contributor != creator, "Creator cannot contribute to own project");

        if (contributorIndex[_contributor] == 0) {
            contributorIndex[_contributor] = ++contributorCount;
        }
        contributions[_contributor] += msg.value;
        raisedAmount += msg.value;

        emit FundingReceived(_contributor, msg.value, raisedAmount, _message);

        if (state != State.Successful && raisedAmount >= targetContribution) {
            state = State.Successful;
            completedAt = block.timestamp;
        }
    }

    /// @notice Status kampanye saat ini; Expired diturunkan dari deadline
    function getCurrentState() public view returns (State) {
        if (state == State.Successful) return State.Successful;
        if (block.timestamp >= deadline) return State.Expired;
        return State.Fundraising;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ---------------------------------------------------------------------
    // Pengelolaan kampanye
    // ---------------------------------------------------------------------

    /// @notice Edit deskripsi, kategori, gambar, dan lokasi selama kampanye berjalan; riwayatnya tersimpan di event
    function editCampaign(
        string calldata _description,
        string calldata _category,
        string calldata _imageUrl,
        string calldata _location
    ) external onlyCreator beforeDeadline {
        require(bytes(_description).length <= MAX_TEXT_LENGTH, "Description is too long");
        require(bytes(_category).length > 0, "Category is required");
        require(bytes(_imageUrl).length <= MAX_URL_LENGTH, "Image URL is too long");
        require(bytes(_location).length <= MAX_LOCATION_LENGTH, "Location is too long");

        projectDescription = _description;
        category = _category;
        imageUrl = _imageUrl;
        location = _location;

        emit CampaignEdited(_description, _category, _imageUrl, _location, block.timestamp);
    }

    /// @notice Perpanjang deadline satu kali (maksimal MAX_EXTENSION) jika target belum tercapai
    function extendDeadline(uint256 _newDeadline) external onlyCreator beforeDeadline {
        require(!deadlineExtended, "Deadline already extended");
        require(state != State.Successful, "Target already reached");
        require(_newDeadline > deadline, "New deadline must be later");
        require(_newDeadline <= deadline + MAX_EXTENSION, "Extension exceeds maximum");

        uint256 previousDeadline = deadline;
        deadline = _newDeadline;
        deadlineExtended = true;

        emit DeadlineExtended(previousDeadline, _newDeadline);
    }

    /// @notice Tutup donasi sekarang (deadline menjadi waktu saat ini); voting & penarikan tetap berjalan
    function closeFunding() external onlyCreator beforeDeadline {
        uint256 previousDeadline = deadline;
        deadline = block.timestamp;
        closedEarly = true;

        emit FundingClosed(previousDeadline, block.timestamp);
    }

    /// @notice Penggalang dana membatalkan kampanye; donatur dapat menarik kembali sisa dana
    function cancelProject(string calldata _reason) external onlyCreator {
        _cancel(false, _reason);
    }

    /// @notice Takedown oleh admin, diteruskan dari contract Crowdfunding
    function takedown(string calldata _reason) external onlyCrowdfunding {
        _cancel(true, _reason);
    }

    // ---------------------------------------------------------------------
    // Kabar dari penggalang dana
    // ---------------------------------------------------------------------

    /// @notice Kabar/laporan penggunaan dana; isi disimpan di event agar hemat gas
    function postUpdate(string memory _message) external onlyCreator {
        require(bytes(_message).length > 0, "Update message is required");
        require(bytes(_message).length <= MAX_TEXT_LENGTH, "Update message is too long");
        emit ProjectUpdatePosted(updateCount++, _message, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // Permintaan penarikan dana
    // ---------------------------------------------------------------------

    function createWithdrawRequest(
        string memory _description,
        uint256 _amount,
        address payable _recipient
    ) external onlyCreator notCancelled notAbandoned {
        require(bytes(_description).length > 0, "Withdraw reason is required");
        require(bytes(_description).length <= MAX_TEXT_LENGTH, "Withdraw reason is too long");
        require(_amount > 0, "Withdraw amount must be greater than 0");
        require(_recipient != address(0), "Invalid recipient address");
        require(
            _amount <= address(this).balance - pendingWithdrawAmount,
            "Withdraw amount exceeds available balance"
        );

        uint256 requestId = withdrawRequestCount++;
        WithdrawRequest storage request = withdrawRequests[requestId];
        request.description = _description;
        request.amount = _amount;
        request.recipient = _recipient;
        request.votingDeadline = block.timestamp + VOTING_PERIOD;
        request.eligibleVoterCount = contributorCount;
        pendingWithdrawAmount += _amount;
        lastCreatorActivity = block.timestamp;

        emit WithdrawRequestCreated(requestId, _description, _amount, _recipient, request.votingDeadline);
    }

    /// @notice Membatalkan permintaan yang belum ditarik untuk melepas saldo yang dipesan
    function cancelWithdrawRequest(uint256 _requestId) external onlyCreator {
        WithdrawRequest storage request = getOpenRequest(_requestId);

        request.isCancelled = true;
        pendingWithdrawAmount -= request.amount;

        emit WithdrawRequestCancelled(_requestId, request.amount);
    }

    function approveWithdrawRequest(uint256 _requestId) external {
        WithdrawRequest storage request = castVote(_requestId, Vote.Approve);
        request.approvalCount++;
        emit WithdrawRequestApproved(_requestId, msg.sender, request.approvalCount);
    }

    function rejectWithdrawRequest(uint256 _requestId) external {
        WithdrawRequest storage request = castVote(_requestId, Vote.Reject);
        request.rejectionCount++;
        emit WithdrawRequestRejected(_requestId, msg.sender, request.rejectionCount);
    }

    /// @notice Menarik dana dari permintaan yang sudah disetujui
    function executeWithdrawRequest(uint256 _requestId) external onlyCreator notCancelled notAbandoned {
        WithdrawRequest storage request = getOpenRequest(_requestId);
        require(getRequestStatus(_requestId) == RequestStatus.Approved, "Withdraw request is not approved");

        // Update state sebelum transfer (cegah reentrancy)
        request.isCompleted = true;
        pendingWithdrawAmount -= request.amount;
        lastCreatorActivity = block.timestamp;

        emit WithdrawCompleted(
            _requestId,
            request.description,
            request.amount,
            request.approvalCount,
            request.recipient
        );

        // call (bukan transfer) agar penerima berupa smart contract wallet tetap bisa menerima dana
        (bool sent, ) = request.recipient.call{value: request.amount}("");
        require(sent, "Transfer failed");
    }

    function hasVoted(uint256 _requestId, address _voter) external view returns (bool) {
        return withdrawRequests[_requestId].votes[_voter] != Vote.None;
    }

    /// @return Suara address untuk permintaan penarikan (0 = None, 1 = Approve, 2 = Reject)
    function getVote(uint256 _requestId, address _voter) external view returns (Vote) {
        return withdrawRequests[_requestId].votes[_voter];
    }

    /// @notice Apakah address berhak voting untuk permintaan ini (sudah berdonasi sebelum permintaan dibuat)
    function canVote(uint256 _requestId, address _voter) public view returns (bool) {
        uint256 index = contributorIndex[_voter];
        return index != 0 && index <= withdrawRequests[_requestId].eligibleVoterCount;
    }

    /// @notice Status permintaan berdasarkan suara, kuorum, dan batas waktu voting
    function getRequestStatus(uint256 _requestId) public view returns (RequestStatus) {
        require(_requestId < withdrawRequestCount, "Withdraw request not found");
        WithdrawRequest storage request = withdrawRequests[_requestId];

        if (request.isCompleted) return RequestStatus.Completed;
        // Pengajuan yang belum ditarik ikut batal saat kampanye dibatalkan
        if (request.isCancelled || isCancelled) return RequestStatus.Cancelled;

        uint256 voters = request.eligibleVoterCount;
        uint256 approvals = request.approvalCount;
        uint256 rejections = request.rejectionCount;

        // Mayoritas mutlak dari pemilih yang berhak (50%+1)
        if (approvals * 2 > voters) return RequestStatus.Approved;
        if (rejections * 2 > voters) return RequestStatus.Rejected;

        if (block.timestamp < request.votingDeadline) return RequestStatus.Voting;

        // Voting selesai: mayoritas dari pemilih, dengan kuorum minimum
        uint256 participants = approvals + rejections;
        bool quorumReached = participants > 0 && participants * 100 >= voters * QUORUM_PERCENT;
        if (quorumReached && approvals > rejections) return RequestStatus.Approved;
        return RequestStatus.Rejected;
    }

    // ---------------------------------------------------------------------
    // Dana terbengkalai & refund
    // ---------------------------------------------------------------------

    /// @notice Waktu mulai donatur boleh menarik kembali sisa dana jika penggalang dana tidak aktif
    function abandonedAt() public view returns (uint256) {
        uint256 lastActivity = lastCreatorActivity > deadline ? lastCreatorActivity : deadline;
        return lastActivity + ABANDON_PERIOD;
    }

    function isAbandoned() public view returns (bool) {
        return block.timestamp >= abandonedAt();
    }

    /// @notice Refund dibuka jika kampanye dibatalkan atau dana terbengkalai
    function isRefundOpen() public view returns (bool) {
        return isCancelled || isAbandoned();
    }

    /// @notice Bagian sisa dana yang bisa ditarik donatur saat refund dibuka
    function refundableAmount(address _contributor) public view returns (uint256) {
        if (!isRefundOpen() || refundClaimed[_contributor] || raisedAmount == 0) return 0;
        uint256 pool = refundPool > 0 ? refundPool : address(this).balance;
        return (contributions[_contributor] * pool) / raisedAmount;
    }

    /// @notice Donatur menarik bagiannya dari sisa dana (proporsional terhadap donasinya)
    function claimRefund() external {
        require(isRefundOpen(), "Refund is not available");
        require(contributions[msg.sender] > 0, "Only contributor can claim");
        require(!refundClaimed[msg.sender], "Refund already claimed");

        // Saldo dibekukan saat klaim pertama agar pembagian adil bagi semua donatur
        if (refundPool == 0) {
            refundPool = address(this).balance;
        }
        uint256 amount = (contributions[msg.sender] * refundPool) / raisedAmount;
        refundClaimed[msg.sender] = true;
        emit RefundClaimed(msg.sender, amount);

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Transfer failed");
    }

    // ---------------------------------------------------------------------
    // View
    // ---------------------------------------------------------------------

    function getProjectDetails()
        external
        view
        returns (
            address payable projectCreator,
            uint256 minContribution,
            uint256 projectDeadline,
            uint256 goalAmount,
            uint256 completedTime,
            uint256 currentAmount,
            string memory title,
            string memory description,
            State currentState,
            uint256 balance
        )
    {
        return (
            creator,
            minimumContribution,
            deadline,
            targetContribution,
            completedAt,
            raisedAmount,
            projectTitle,
            projectDescription,
            getCurrentState(),
            address(this).balance
        );
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    function _cancel(bool _byAdmin, string calldata _reason) internal notCancelled {
        require(bytes(_reason).length > 0, "Cancel reason is required");
        require(bytes(_reason).length <= MAX_TEXT_LENGTH, "Cancel reason is too long");

        isCancelled = true;
        cancelledByAdmin = _byAdmin;
        cancelledAt = block.timestamp;
        // Donasi berhenti, dan saldo yang dipesan pengajuan penarikan dilepas untuk refund
        if (block.timestamp < deadline) deadline = block.timestamp;
        pendingWithdrawAmount = 0;

        emit ProjectCancelled(_byAdmin, _reason, block.timestamp);
    }

    function getOpenRequest(uint256 _requestId) internal view returns (WithdrawRequest storage request) {
        require(!isCancelled, "Project is cancelled");
        require(_requestId < withdrawRequestCount, "Withdraw request not found");
        request = withdrawRequests[_requestId];
        require(!request.isCompleted && !request.isCancelled, "Withdraw request is closed");
    }

    function castVote(uint256 _requestId, Vote _vote) internal returns (WithdrawRequest storage request) {
        require(msg.sender != creator, "Creator cannot vote");
        require(contributions[msg.sender] > 0, "Only contributor can vote");
        request = getOpenRequest(_requestId);
        require(canVote(_requestId, msg.sender), "Only contributors before the request can vote");
        require(block.timestamp < request.votingDeadline, "Voting period has ended");
        require(request.votes[msg.sender] == Vote.None, "You already voted");
        request.votes[msg.sender] = _vote;
    }
}

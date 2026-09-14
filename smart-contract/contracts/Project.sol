// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.24;

/**
 * @title Project
 * @notice Satu kampanye crowdfunding dengan model keep-it-all: dana yang terkumpul boleh ditarik
 *         penggalang dana berapa pun jumlahnya (tidak harus mencapai target), selama permintaan
 *         penarikan disetujui donatur. Tidak ada refund.
 *
 * Aturan persetujuan permintaan penarikan:
 * - Setuju > 50% dari semua donatur -> langsung disetujui
 * - Tolak  > 50% dari semua donatur -> langsung ditolak
 * - Setelah VOTING_PERIOD lewat: disetujui jika jumlah pemilih >= QUORUM_PERCENT donatur
 *   dan suara setuju > suara tolak; selain itu ditolak.
 *   Tujuannya agar donatur pasif (tidak pernah voting) tidak mengunci dana selamanya.
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
        bool isCompleted;
        bool isCancelled;
        mapping(address => Vote) votes;
    }

    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant QUORUM_PERCENT = 20;

    /// Contract Crowdfunding yang membuat project ini (satu-satunya yang boleh meneruskan donasi)
    address public immutable crowdfunding;
    address payable public immutable creator;

    uint256 public minimumContribution;
    /// UNIX timestamp dalam detik, dibandingkan dengan block.timestamp
    uint256 public deadline;
    uint256 public targetContribution;
    string public projectTitle;
    string public projectDescription;

    State public state = State.Fundraising;
    uint256 public completedAt;
    uint256 public raisedAmount;
    uint256 public contributorCount;
    mapping(address => uint256) public contributions;

    mapping(uint256 => WithdrawRequest) public withdrawRequests;
    uint256 public withdrawRequestCount;
    /// Total dana yang sedang diajukan (belum ditarik), agar pengajuan tidak melebihi saldo
    uint256 public pendingWithdrawAmount;

    event FundingReceived(address contributor, uint256 amount, uint256 currentTotal);
    event WithdrawRequestCreated(
        uint256 requestId,
        string description,
        uint256 amount,
        address recipient,
        uint256 votingDeadline
    );
    event WithdrawRequestApproved(uint256 requestId, address voter, uint256 approvalCount);
    event WithdrawRequestRejected(uint256 requestId, address voter, uint256 rejectionCount);
    event WithdrawRequestCancelled(uint256 requestId, uint256 amount);
    event WithdrawCompleted(
        uint256 requestId,
        string description,
        uint256 amount,
        uint256 approvalCount,
        address recipient
    );

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

    constructor(
        address _creator,
        uint256 _minimumContribution,
        uint256 _deadline,
        uint256 _targetContribution,
        string memory _projectTitle,
        string memory _projectDescription
    ) {
        crowdfunding = msg.sender;
        creator = payable(_creator);
        minimumContribution = _minimumContribution;
        deadline = _deadline;
        targetContribution = _targetContribution;
        projectTitle = _projectTitle;
        projectDescription = _projectDescription;
    }

    // ---------------------------------------------------------------------
    // Donasi
    // ---------------------------------------------------------------------

    /// @notice Donasi dibuka sampai deadline, termasuk setelah target tercapai
    function contribute(address _contributor) external payable onlyCrowdfunding beforeDeadline {
        require(msg.value > 0 && msg.value >= minimumContribution, "Contribution amount is too low");
        // Pembuat kampanye tidak boleh berdonasi, agar tidak bisa memberi suara untuk penarikannya sendiri
        require(_contributor != creator, "Creator cannot contribute to own project");

        if (contributions[_contributor] == 0) {
            contributorCount++;
        }
        contributions[_contributor] += msg.value;
        raisedAmount += msg.value;

        emit FundingReceived(_contributor, msg.value, raisedAmount);

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
    // Permintaan penarikan dana
    // ---------------------------------------------------------------------

    function createWithdrawRequest(
        string memory _description,
        uint256 _amount,
        address payable _recipient
    ) external onlyCreator {
        require(bytes(_description).length > 0, "Withdraw reason is required");
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
        pendingWithdrawAmount += _amount;

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
    function executeWithdrawRequest(uint256 _requestId) external onlyCreator {
        WithdrawRequest storage request = getOpenRequest(_requestId);
        require(getRequestStatus(_requestId) == RequestStatus.Approved, "Withdraw request is not approved");

        // Update state sebelum transfer (cegah reentrancy)
        request.isCompleted = true;
        pendingWithdrawAmount -= request.amount;

        // call (bukan transfer) agar penerima berupa smart contract wallet tetap bisa menerima dana
        (bool sent, ) = request.recipient.call{value: request.amount}("");
        require(sent, "Transfer failed");

        emit WithdrawCompleted(
            _requestId,
            request.description,
            request.amount,
            request.approvalCount,
            request.recipient
        );
    }

    function hasVoted(uint256 _requestId, address _voter) external view returns (bool) {
        return withdrawRequests[_requestId].votes[_voter] != Vote.None;
    }

    /// @return Suara address untuk permintaan penarikan (0 = None, 1 = Approve, 2 = Reject)
    function getVote(uint256 _requestId, address _voter) external view returns (Vote) {
        return withdrawRequests[_requestId].votes[_voter];
    }

    /// @notice Status permintaan berdasarkan suara, kuorum, dan batas waktu voting
    function getRequestStatus(uint256 _requestId) public view returns (RequestStatus) {
        require(_requestId < withdrawRequestCount, "Withdraw request not found");
        WithdrawRequest storage request = withdrawRequests[_requestId];

        if (request.isCompleted) return RequestStatus.Completed;
        if (request.isCancelled) return RequestStatus.Cancelled;

        uint256 approvals = request.approvalCount;
        uint256 rejections = request.rejectionCount;

        // Mayoritas mutlak dari semua donatur (50%+1)
        if (approvals * 2 > contributorCount) return RequestStatus.Approved;
        if (rejections * 2 > contributorCount) return RequestStatus.Rejected;

        if (block.timestamp < request.votingDeadline) return RequestStatus.Voting;

        // Voting selesai: mayoritas dari pemilih, dengan kuorum minimum
        uint256 participants = approvals + rejections;
        bool quorumReached = participants > 0 && participants * 100 >= contributorCount * QUORUM_PERCENT;
        if (quorumReached && approvals > rejections) return RequestStatus.Approved;
        return RequestStatus.Rejected;
    }

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

    function getOpenRequest(uint256 _requestId) internal view returns (WithdrawRequest storage request) {
        require(_requestId < withdrawRequestCount, "Withdraw request not found");
        request = withdrawRequests[_requestId];
        require(!request.isCompleted && !request.isCancelled, "Withdraw request is closed");
    }

    function castVote(uint256 _requestId, Vote _vote) internal returns (WithdrawRequest storage request) {
        require(msg.sender != creator, "Creator cannot vote");
        require(contributions[msg.sender] > 0, "Only contributor can vote");
        request = getOpenRequest(_requestId);
        require(block.timestamp < request.votingDeadline, "Voting period has ended");
        require(request.votes[msg.sender] == Vote.None, "You already voted");
        request.votes[msg.sender] = _vote;
    }
}

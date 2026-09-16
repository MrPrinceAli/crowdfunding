const { expect } = require("chai");
const { ethers } = require("hardhat");

const etherToWei = (n) => {
  return ethers.utils.parseUnits(n, "ether");
};

const DAY = 24 * 60 * 60;

// Pakai waktu blockchain, bukan Date.now(), karena beberapa test memajukan waktu (evm_increaseTime)
const latestTimestamp = async () => (await ethers.provider.getBlock("latest")).timestamp;

const increaseTime = async (seconds) => {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
};

describe("Project", () => {
  var creator; // pembuat kampanye (bukan donatur)
  var address1; // donatur
  var address2; // donatur
  var projectContract;

  beforeEach(async function () {
    [address1, address2, creator, ...address] = await ethers.getSigners();

    const minimumContribution = etherToWei("1");
    const deadline = (await latestTimestamp()) + 30 * DAY;
    const targetContribution = etherToWei("10");
    const projectTitle = "Testing project";
    const projectDes = "Testing project description";

    const Project = await ethers.getContractFactory("Project");
    projectContract = await Project.deploy(
      creator.address,
      minimumContribution,
      deadline,
      targetContribution,
      projectTitle,
      projectDes,
      "Pendidikan",
      "https://example.com/cover.jpg",
      "Jawa Barat",
    );
  });

  describe("Check project variables & Contribute", async function () {
    it("Validate variables", async function () {
      expect(await projectContract.creator()).to.equal(creator.address);
      expect(await projectContract.minimumContribution()).to.equal(etherToWei("1"));
      expect(Number(await projectContract.deadline())).to.greaterThan(0);
      expect(await projectContract.targetContribution()).to.equal(etherToWei("10"));
      expect(await projectContract.projectTitle()).to.equal("Testing project");
      expect(await projectContract.projectDescription()).to.equal("Testing project description");
      expect(await projectContract.state()).to.equal(+0);
      expect(await projectContract.contributorCount()).to.equal(0);
    });

    it("Contribute", async function () {
      const project = await projectContract.contribute(address1.address, "", { value: etherToWei("4") });
      const event = await project.wait();

      // Test Event
      expect(event.events.length).to.equal(1);
      expect(event.events[0].event).to.equal("FundingReceived");
      expect(event.events[0].args.contributor).to.equal(address1.address);
      expect(event.events[0].args.amount).to.equal(etherToWei("4"));
      expect(event.events[0].args.currentTotal).to.equal(etherToWei("4"));

      expect(await projectContract.contributorCount()).to.equal(1);
      expect(await projectContract.getContractBalance()).to.equal(etherToWei("4"));
    });

    it("Should fail if amount is less than minimum contribution amount", async () => {
      await expect(
        projectContract.connect(address1).contribute(address1.address, "", { value: etherToWei("0.5") }),
      ).to.be.revertedWith("Contribution amount is too low");
    });

    it("Should fail to contribute after deadline", async () => {
      await increaseTime(31 * DAY);
      await expect(projectContract.contribute(address1.address, "", { value: etherToWei("2") })).to.be.revertedWith(
        "Deadline has passed",
      );
    });

    it("Should fail if contribute is not called through Crowdfunding contract", async () => {
      await expect(
        projectContract.connect(address2).contribute(address2.address, "", { value: etherToWei("2") }),
      ).to.be.revertedWith("Contribute only through Crowdfunding contract");
    });

    it("Should fail if creator contributes to own project", async () => {
      await expect(projectContract.contribute(creator.address, "", { value: etherToWei("2") })).to.be.revertedWith(
        "Creator cannot contribute to own project",
      );
    });

    it("State should change to Successful if targeted amount hit ", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("12") });
      expect(Number(await projectContract.completedAt())).to.greaterThan(0);
      expect(await projectContract.state()).to.equal(+2);
    });

    it("Can still contribute after target reached (before deadline)", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("10") });
      await projectContract.contribute(address2.address, "", { value: etherToWei("3") });
      expect(await projectContract.raisedAmount()).to.equal(etherToWei("13"));
      expect(await projectContract.getCurrentState()).to.equal(2);
    });

    it("Current state should be Expired after deadline if target not reached", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("3") });
      expect(await projectContract.getCurrentState()).to.equal(0);
      await increaseTime(31 * DAY);
      expect(await projectContract.getCurrentState()).to.equal(1);
      expect((await projectContract.getProjectDetails()).currentState).to.equal(1);
    });
  });

  describe("Create withdraw request", async function () {
    it("Should fail if someone else try to request (Only owner can make request) ", async () => {
      await expect(
        projectContract
          .connect(address2)
          .createWithdrawRequest("Testing description", etherToWei("2"), address2.address),
      ).to.be.revertedWith("Only creator can perform this action");
    });

    it("Should fail if there is no balance", async () => {
      await expect(
        projectContract.connect(creator).createWithdrawRequest("Testing description", etherToWei("2"), creator.address),
      ).to.be.revertedWith("Withdraw amount exceeds available balance");
    });

    it("Creator can request withdraw before target reached (keep-it-all)", async () => {
      await projectContract.contribute(address2.address, "", { value: etherToWei("3") });
      const event = await (
        await projectContract.connect(creator).createWithdrawRequest("Partial", etherToWei("2"), creator.address)
      ).wait();
      expect(event.events[0].event).to.equal("WithdrawRequestCreated");
      expect(await projectContract.state()).to.equal(0);
    });

    it("Should fail if withdraw reason is empty", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("5") });
      await expect(
        projectContract.connect(creator).createWithdrawRequest("", etherToWei("1"), creator.address),
      ).to.be.revertedWith("Withdraw reason is required");
    });

    it("Should fail if withdraw amount is 0", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("12") });
      await expect(
        projectContract.connect(creator).createWithdrawRequest("Zero", 0, creator.address),
      ).to.be.revertedWith("Withdraw amount must be greater than 0");
    });

    it("Should fail if recipient is zero address", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("12") });
      await expect(
        projectContract
          .connect(creator)
          .createWithdrawRequest("Zero address", etherToWei("1"), ethers.constants.AddressZero),
      ).to.be.revertedWith("Invalid recipient address");
    });

    it("Should fail if withdraw amount exceeds contract balance", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("12") });
      await expect(
        projectContract.connect(creator).createWithdrawRequest("Too much", etherToWei("13"), creator.address),
      ).to.be.revertedWith("Withdraw amount exceeds available balance");
    });

    it("Should fail if total pending requests exceed contract balance", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("12") });
      await projectContract.connect(creator).createWithdrawRequest("First", etherToWei("8"), creator.address);
      await expect(
        projectContract.connect(creator).createWithdrawRequest("Second", etherToWei("5"), creator.address),
      ).to.be.revertedWith("Withdraw amount exceeds available balance");
      await projectContract.connect(creator).createWithdrawRequest("Second", etherToWei("4"), creator.address);
      expect(await projectContract.pendingWithdrawAmount()).to.equal(etherToWei("12"));
    });

    it("Request for withdraw", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("12") });
      const withdrawRequest = await projectContract
        .connect(creator)
        .createWithdrawRequest("Testing description", etherToWei("2"), creator.address);
      const event = await withdrawRequest.wait();

      // Test Event
      expect(event.events.length).to.equal(1);
      expect(event.events[0].event).to.equal("WithdrawRequestCreated");
      expect(event.events[0].args.description).to.equal("Testing description");
      expect(event.events[0].args.amount).to.equal(etherToWei("2"));
      expect(event.events[0].args.recipient).to.equal(creator.address);
      expect(event.events[0].args.requestId).to.equal(0);
      expect(event.events[0].args.votingDeadline).to.equal((await latestTimestamp()) + 3 * DAY);
    });

    it("Request id should match withdrawRequests index", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("12") });
      await projectContract.connect(creator).createWithdrawRequest("First", etherToWei("1"), creator.address);
      const second = await (
        await projectContract.connect(creator).createWithdrawRequest("Second", etherToWei("2"), creator.address)
      ).wait();

      const requestId = second.events[0].args.requestId;
      expect(requestId).to.equal(1);
      expect((await projectContract.withdrawRequests(requestId)).description).to.equal("Second");
    });
  });

  describe("Vote for withdraw request", async function () {
    it("Only contributor can vote ", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("12") });
      await projectContract
        .connect(creator)
        .createWithdrawRequest("Testing description", etherToWei("2"), creator.address);
      await expect(projectContract.connect(address2).approveWithdrawRequest(0)).to.be.revertedWith(
        "Only contributor can vote",
      );
    });

    it("Vote withdraw request", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("6") });
      await projectContract.contribute(address2.address, "", { value: etherToWei("7") });

      await projectContract
        .connect(creator)
        .createWithdrawRequest("Testing description", etherToWei("2"), creator.address);
      const voteForWithdraw = await projectContract.connect(address2).approveWithdrawRequest(0);
      const event = await voteForWithdraw.wait();

      // Test Event
      expect(event.events.length).to.equal(1);
      expect(event.events[0].event).to.equal("WithdrawRequestApproved");
      expect(event.events[0].args.voter).to.equal(address2.address);
      expect(Number(event.events[0].args.approvalCount)).to.equal(1);
    });

    it("Creator cannot vote own withdraw request", async () => {
      await projectContract.contribute(address2.address, "", { value: etherToWei("5") });
      await projectContract.connect(creator).createWithdrawRequest("Self vote", etherToWei("5"), creator.address);
      await expect(projectContract.connect(creator).approveWithdrawRequest(0)).to.be.revertedWith(
        "Creator cannot vote",
      );
      await expect(projectContract.connect(creator).executeWithdrawRequest(0)).to.be.revertedWith(
        "Withdraw request is not approved",
      );
    });

    it("Should fail if withdraw request not found", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("12") });
      await expect(projectContract.connect(address1).approveWithdrawRequest(0)).to.be.revertedWith(
        "Withdraw request not found",
      );
    });

    it("hasVoted should reflect voting status", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("6") });
      await projectContract.contribute(address2.address, "", { value: etherToWei("7") });
      await projectContract
        .connect(creator)
        .createWithdrawRequest("Testing description", etherToWei("2"), creator.address);

      expect(await projectContract.hasVoted(0, address2.address)).to.equal(false);
      await projectContract.connect(address2).approveWithdrawRequest(0);
      expect(await projectContract.hasVoted(0, address2.address)).to.equal(true);
      expect(await projectContract.hasVoted(0, address1.address)).to.equal(false);
    });

    it("Should fail if request already vote", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("6") });
      await projectContract.contribute(address2.address, "", { value: etherToWei("7") });

      await projectContract
        .connect(creator)
        .createWithdrawRequest("Testing description", etherToWei("2"), creator.address);
      await projectContract.connect(address2).approveWithdrawRequest(0);

      await expect(projectContract.connect(address2).approveWithdrawRequest(0)).to.be.revertedWith("You already voted");
    });
  });

  describe("Reject, voting period & quorum", async function () {
    // Tambah n donatur (masing-masing 1 ETH) dari signer cadangan
    const addDonors = async (n) => {
      const donors = address.slice(0, n);
      for (const donor of donors) {
        await projectContract.contribute(donor.address, "", { value: etherToWei("1") });
      }
      return donors;
    };
    const STATUS = { Voting: 0, Approved: 1, Rejected: 2, Completed: 3, Cancelled: 4 };

    it("Donor can reject and vote is recorded", async () => {
      const [d1] = await addDonors(3);
      await projectContract.connect(creator).createWithdrawRequest("Reason", etherToWei("1"), creator.address);

      const event = await (await projectContract.connect(d1).rejectWithdrawRequest(0)).wait();
      expect(event.events[0].event).to.equal("WithdrawRequestRejected");
      expect((await projectContract.withdrawRequests(0)).rejectionCount).to.equal(1);
      expect(await projectContract.getVote(0, d1.address)).to.equal(2);
      expect(await projectContract.hasVoted(0, d1.address)).to.equal(true);
      await expect(projectContract.connect(d1).approveWithdrawRequest(0)).to.be.revertedWith("You already voted");
    });

    it("More than 50% rejects -> rejected immediately", async () => {
      const [d1, d2] = await addDonors(3);
      await projectContract.connect(creator).createWithdrawRequest("Reason", etherToWei("1"), creator.address);
      await projectContract.connect(d1).rejectWithdrawRequest(0);
      expect(await projectContract.getRequestStatus(0)).to.equal(STATUS.Voting);
      await projectContract.connect(d2).rejectWithdrawRequest(0);
      expect(await projectContract.getRequestStatus(0)).to.equal(STATUS.Rejected);
      await expect(projectContract.connect(creator).executeWithdrawRequest(0)).to.be.revertedWith(
        "Withdraw request is not approved",
      );
    });

    it("Passive donors: approved after voting period if quorum (20%) reached and approvals > rejects", async () => {
      const [d1, d2] = await addDonors(10);
      await projectContract.connect(creator).createWithdrawRequest("Reason", etherToWei("3"), creator.address);
      await projectContract.connect(d1).approveWithdrawRequest(0);
      await projectContract.connect(d2).approveWithdrawRequest(0);

      // 2 dari 10 setuju: belum mayoritas mutlak, masih masa voting
      expect(await projectContract.getRequestStatus(0)).to.equal(STATUS.Voting);
      await expect(projectContract.connect(creator).executeWithdrawRequest(0)).to.be.revertedWith(
        "Withdraw request is not approved",
      );

      await increaseTime(3 * DAY);
      expect(await projectContract.getRequestStatus(0)).to.equal(STATUS.Approved);
      await expect(() => projectContract.connect(creator).executeWithdrawRequest(0)).to.changeEtherBalance(
        creator,
        etherToWei("3"),
      );
      expect(await projectContract.getRequestStatus(0)).to.equal(STATUS.Completed);
    });

    it("After voting period: rejected if quorum not reached", async () => {
      const [d1] = await addDonors(10);
      await projectContract.connect(creator).createWithdrawRequest("Reason", etherToWei("1"), creator.address);
      await projectContract.connect(d1).approveWithdrawRequest(0); // 1 dari 10 = 10% < 20%

      await increaseTime(3 * DAY);
      expect(await projectContract.getRequestStatus(0)).to.equal(STATUS.Rejected);
    });

    it("After voting period: rejected on tie, approved when approvals > rejects", async () => {
      const [d1, d2, d3, d4, d5] = await addDonors(10);
      await projectContract.connect(creator).createWithdrawRequest("Tie", etherToWei("1"), creator.address);
      await projectContract.connect(d1).approveWithdrawRequest(0);
      await projectContract.connect(d2).rejectWithdrawRequest(0);

      await projectContract.connect(creator).createWithdrawRequest("Win", etherToWei("1"), creator.address);
      await projectContract.connect(d3).approveWithdrawRequest(1);
      await projectContract.connect(d4).approveWithdrawRequest(1);
      await projectContract.connect(d5).rejectWithdrawRequest(1);

      await increaseTime(3 * DAY);
      expect(await projectContract.getRequestStatus(0)).to.equal(STATUS.Rejected);
      expect(await projectContract.getRequestStatus(1)).to.equal(STATUS.Approved);
    });

    it("After voting period: rejected if nobody voted", async () => {
      await addDonors(2);
      await projectContract.connect(creator).createWithdrawRequest("Reason", etherToWei("1"), creator.address);
      await increaseTime(3 * DAY);
      expect(await projectContract.getRequestStatus(0)).to.equal(STATUS.Rejected);
    });

    it("Cannot vote after voting period ended", async () => {
      const [d1] = await addDonors(3);
      await projectContract.connect(creator).createWithdrawRequest("Reason", etherToWei("1"), creator.address);
      await increaseTime(3 * DAY);
      await expect(projectContract.connect(d1).approveWithdrawRequest(0)).to.be.revertedWith("Voting period has ended");
      await expect(projectContract.connect(d1).rejectWithdrawRequest(0)).to.be.revertedWith("Voting period has ended");
    });

    it("Rejected request can be cancelled to release reserved balance", async () => {
      const [d1, d2] = await addDonors(2);
      await projectContract.connect(creator).createWithdrawRequest("Reason", etherToWei("2"), creator.address);
      await projectContract.connect(d1).rejectWithdrawRequest(0);
      await projectContract.connect(d2).rejectWithdrawRequest(0);
      expect(await projectContract.pendingWithdrawAmount()).to.equal(etherToWei("2"));

      await projectContract.connect(creator).cancelWithdrawRequest(0);
      expect(await projectContract.pendingWithdrawAmount()).to.equal(0);
      expect(await projectContract.getRequestStatus(0)).to.equal(STATUS.Cancelled);
    });
  });

  describe("Cancel withdraw request", async function () {
    it("Creator can cancel request and release reserved balance", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("5") });
      await projectContract.connect(creator).createWithdrawRequest("Stuck", etherToWei("5"), creator.address);
      await expect(
        projectContract.connect(creator).createWithdrawRequest("New", etherToWei("1"), creator.address),
      ).to.be.revertedWith("Withdraw amount exceeds available balance");

      const event = await (await projectContract.connect(creator).cancelWithdrawRequest(0)).wait();
      expect(event.events[0].event).to.equal("WithdrawRequestCancelled");
      expect(event.events[0].args.amount).to.equal(etherToWei("5"));
      expect(await projectContract.pendingWithdrawAmount()).to.equal(0);
      expect((await projectContract.withdrawRequests(0)).isCancelled).to.equal(true);

      await projectContract.connect(creator).createWithdrawRequest("New", etherToWei("5"), creator.address);
    });

    it("Only creator can cancel", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("5") });
      await projectContract.connect(creator).createWithdrawRequest("Stuck", etherToWei("5"), creator.address);
      await expect(projectContract.connect(address1).cancelWithdrawRequest(0)).to.be.revertedWith(
        "Only creator can perform this action",
      );
    });

    it("Cancelled request cannot be voted, withdrawn or cancelled again", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("5") });
      await projectContract.connect(creator).createWithdrawRequest("Stuck", etherToWei("5"), creator.address);
      await projectContract.connect(address1).approveWithdrawRequest(0);
      await projectContract.connect(creator).cancelWithdrawRequest(0);

      await expect(projectContract.connect(address1).approveWithdrawRequest(0)).to.be.revertedWith(
        "Withdraw request is closed",
      );
      await expect(projectContract.connect(creator).executeWithdrawRequest(0)).to.be.revertedWith(
        "Withdraw request is closed",
      );
      await expect(projectContract.connect(creator).cancelWithdrawRequest(0)).to.be.revertedWith(
        "Withdraw request is closed",
      );
    });

    it("Completed request cannot be cancelled", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("5") });
      await projectContract.connect(creator).createWithdrawRequest("Done", etherToWei("2"), creator.address);
      await projectContract.connect(address1).approveWithdrawRequest(0);
      await projectContract.connect(creator).executeWithdrawRequest(0);
      await expect(projectContract.connect(creator).cancelWithdrawRequest(0)).to.be.revertedWith(
        "Withdraw request is closed",
      );
    });
  });

  describe("Withdraw balance", async function () {
    it("Should fail if majority of contributors have not voted", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("6") });
      await projectContract.contribute(address2.address, "", { value: etherToWei("7") });

      await projectContract
        .connect(creator)
        .createWithdrawRequest("Testing description", etherToWei("2"), creator.address);

      await expect(projectContract.connect(creator).executeWithdrawRequest(0)).to.be.revertedWith(
        "Withdraw request is not approved",
      );
    });

    it("Withdraw requested balance", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("6") });
      await projectContract.contribute(address2.address, "", { value: etherToWei("7") });

      await projectContract
        .connect(creator)
        .createWithdrawRequest("Testing description", etherToWei("2"), creator.address);
      await projectContract.connect(address1).approveWithdrawRequest(0);
      await projectContract.connect(address2).approveWithdrawRequest(0);

      const withdrawAmount = await projectContract.connect(creator).executeWithdrawRequest(0);
      const event = await withdrawAmount.wait();

      // Test Event
      expect(event.events.length).to.equal(1);
      expect(event.events[0].event).to.equal("WithdrawCompleted");
      expect(event.events[0].args.amount).to.equal(etherToWei("2"));
      expect(event.events[0].args.recipient).to.equal(creator.address);
    });

    it("Single contributor: should fail without any vote", async () => {
      await projectContract.contribute(address2.address, "", { value: etherToWei("12") });
      await projectContract.connect(creator).createWithdrawRequest("No vote", etherToWei("2"), creator.address);
      await expect(projectContract.connect(creator).executeWithdrawRequest(0)).to.be.revertedWith(
        "Withdraw request is not approved",
      );

      await projectContract.connect(address2).approveWithdrawRequest(0);
      await expect(() => projectContract.connect(creator).executeWithdrawRequest(0)).to.changeEtherBalance(
        creator,
        etherToWei("2"),
      );
    });

    it("Two contributors: tie (1 vote) is not enough, 2 votes is enough", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("4") });
      await projectContract.contribute(address2.address, "", { value: etherToWei("4") });

      await projectContract.connect(creator).createWithdrawRequest("Tie", etherToWei("2"), creator.address);
      await projectContract.connect(address1).approveWithdrawRequest(0);
      await expect(projectContract.connect(creator).executeWithdrawRequest(0)).to.be.revertedWith(
        "Withdraw request is not approved",
      );

      await projectContract.connect(address2).approveWithdrawRequest(0);
      await expect(() => projectContract.connect(creator).executeWithdrawRequest(0)).to.changeEtherBalance(
        creator,
        etherToWei("2"),
      );
    });

    it("Four contributors: 2 votes (50%) is not enough, 3 votes (50%+1) is enough", async () => {
      const [address3, address4] = address;
      for (const donor of [address1, address2, address3, address4]) {
        await projectContract.contribute(donor.address, "", { value: etherToWei("2") });
      }

      await projectContract.connect(creator).createWithdrawRequest("Majority", etherToWei("2"), creator.address);
      await projectContract.connect(address1).approveWithdrawRequest(0);
      await projectContract.connect(address2).approveWithdrawRequest(0);
      await expect(projectContract.connect(creator).executeWithdrawRequest(0)).to.be.revertedWith(
        "Withdraw request is not approved",
      );

      await projectContract.connect(address3).approveWithdrawRequest(0);
      await projectContract.connect(creator).executeWithdrawRequest(0);
    });

    it("Three contributors: 1 vote is not enough, 2 votes is enough", async () => {
      const address3 = address[0];
      await projectContract.contribute(address1.address, "", { value: etherToWei("4") });
      await projectContract.contribute(address2.address, "", { value: etherToWei("4") });
      await projectContract.contribute(address3.address, "", { value: etherToWei("4") });

      await projectContract.connect(creator).createWithdrawRequest("Majority", etherToWei("2"), creator.address);
      await projectContract.connect(address2).approveWithdrawRequest(0);
      await expect(projectContract.connect(creator).executeWithdrawRequest(0)).to.be.revertedWith(
        "Withdraw request is not approved",
      );

      await projectContract.connect(address3).approveWithdrawRequest(0);
      await projectContract.connect(creator).executeWithdrawRequest(0);
      expect(await projectContract.pendingWithdrawAmount()).to.equal(0);
    });

    it("Project that did not reach target can withdraw after deadline (keep-it-all)", async () => {
      await projectContract.contribute(address2.address, "", { value: etherToWei("3") });
      await increaseTime(31 * DAY);

      await projectContract.connect(creator).createWithdrawRequest("After deadline", etherToWei("3"), creator.address);
      await projectContract.connect(address2).approveWithdrawRequest(0);
      await expect(() => projectContract.connect(creator).executeWithdrawRequest(0)).to.changeEtherBalance(
        creator,
        etherToWei("3"),
      );
    });

    it("Successful project can still withdraw after deadline", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("6") });
      await projectContract.contribute(address2.address, "", { value: etherToWei("7") });
      await increaseTime(31 * DAY);

      await projectContract.connect(creator).createWithdrawRequest("After deadline", etherToWei("2"), creator.address);
      await projectContract.connect(address1).approveWithdrawRequest(0);
      await projectContract.connect(address2).approveWithdrawRequest(0);
      await expect(() => projectContract.connect(creator).executeWithdrawRequest(0)).to.changeEtherBalance(
        creator,
        etherToWei("2"),
      );
    });

    it("Can withdraw to a smart contract wallet (uses call instead of transfer)", async () => {
      const Wallet = await ethers.getContractFactory("TestWallet");
      const wallet = await Wallet.deploy();
      await projectContract.contribute(address1.address, "", { value: etherToWei("5") });

      await projectContract.connect(creator).createWithdrawRequest("To multisig", etherToWei("2"), wallet.address);
      await projectContract.connect(address1).approveWithdrawRequest(0);
      await projectContract.connect(creator).executeWithdrawRequest(0);

      expect(await ethers.provider.getBalance(wallet.address)).to.equal(etherToWei("2"));
      expect(await wallet.received()).to.equal(1);
    });

    it("Should fail if request already completed", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("6") });
      await projectContract.contribute(address2.address, "", { value: etherToWei("7") });

      await projectContract
        .connect(creator)
        .createWithdrawRequest("Testing description", etherToWei("2"), creator.address);
      await projectContract.connect(address1).approveWithdrawRequest(0);
      await projectContract.connect(address2).approveWithdrawRequest(0);
      await projectContract.connect(creator).executeWithdrawRequest(0);

      await expect(projectContract.connect(creator).executeWithdrawRequest(0)).to.be.revertedWith(
        "Withdraw request is closed",
      );
    });
  });
  describe("Metadata", async function () {
    it("Stores category and image URL", async () => {
      expect(await projectContract.category()).to.equal("Pendidikan");
      expect(await projectContract.imageUrl()).to.equal("https://example.com/cover.jpg");
    });
  });

  describe("Voting snapshot (donatur baru tidak bisa mengubah keputusan)", async function () {
    it("Late contributors cannot flip an approved request", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("2") });
      await projectContract.contribute(address2.address, "", { value: etherToWei("2") });
      await projectContract.connect(creator).createWithdrawRequest("Reason", etherToWei("1"), creator.address);
      await projectContract.connect(address1).approveWithdrawRequest(0);

      await increaseTime(3 * DAY);
      expect(await projectContract.getRequestStatus(0)).to.equal(1); // Approved (kuorum 1/2, setuju > tolak)

      for (const lateDonor of address.slice(0, 5)) {
        await projectContract.contribute(lateDonor.address, "", { value: etherToWei("1") });
      }
      expect(await projectContract.contributorCount()).to.equal(7);
      expect(await projectContract.getRequestStatus(0)).to.equal(1); // tetap Approved
      await projectContract.connect(creator).executeWithdrawRequest(0);
    });

    it("Late contributors cannot vote on older requests", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("2") });
      await projectContract.connect(creator).createWithdrawRequest("Reason", etherToWei("1"), creator.address);
      await projectContract.contribute(address2.address, "", { value: etherToWei("2") });

      expect((await projectContract.withdrawRequests(0)).eligibleVoterCount).to.equal(1);
      expect(await projectContract.canVote(0, address1.address)).to.equal(true);
      expect(await projectContract.canVote(0, address2.address)).to.equal(false);
      await expect(projectContract.connect(address2).approveWithdrawRequest(0)).to.be.revertedWith(
        "Only contributors before the request can vote",
      );

      // Permintaan baru mengikutsertakan donatur baru
      await projectContract.connect(creator).createWithdrawRequest("Second", etherToWei("1"), creator.address);
      expect(await projectContract.canVote(1, address2.address)).to.equal(true);
    });
  });

  describe("Project updates", async function () {
    it("Creator can post updates", async () => {
      const receipt = await (await projectContract.connect(creator).postUpdate("Buku sudah dibeli")).wait();
      expect(receipt.events[0].event).to.equal("ProjectUpdatePosted");
      expect(receipt.events[0].args.updateId).to.equal(0);
      expect(receipt.events[0].args.message).to.equal("Buku sudah dibeli");
      expect(await projectContract.updateCount()).to.equal(1);
    });

    it("Only creator can post non-empty updates", async () => {
      await expect(projectContract.connect(address1).postUpdate("Hi")).to.be.revertedWith(
        "Only creator can perform this action",
      );
      await expect(projectContract.connect(creator).postUpdate("")).to.be.revertedWith("Update message is required");
    });
  });

  describe("Abandoned funds", async function () {
    const fundAndWithdraw = async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("6") });
      await projectContract.contribute(address2.address, "", { value: etherToWei("4") });
      await projectContract.connect(creator).createWithdrawRequest("Half", etherToWei("5"), creator.address);
      await projectContract.connect(address1).approveWithdrawRequest(0);
      await projectContract.connect(address2).approveWithdrawRequest(0);
      await projectContract.connect(creator).executeWithdrawRequest(0);
    };

    it("Is not abandoned before deadline + 30 days", async () => {
      await fundAndWithdraw();
      await increaseTime(59 * DAY);
      expect(await projectContract.isAbandoned()).to.equal(false);
      await expect(projectContract.connect(address1).claimRefund()).to.be.revertedWith("Refund is not available");
    });

    it("Contributors claim remaining funds proportionally", async () => {
      await fundAndWithdraw(); // sisa saldo 5 ETH dari total donasi 10 ETH
      await increaseTime(61 * DAY);

      expect(await projectContract.isAbandoned()).to.equal(true);
      expect(await projectContract.refundableAmount(address1.address)).to.equal(etherToWei("3"));
      await expect(() => projectContract.connect(address1).claimRefund()).to.changeEtherBalance(
        address1,
        etherToWei("3"),
      );
      await expect(() => projectContract.connect(address2).claimRefund()).to.changeEtherBalance(
        address2,
        etherToWei("2"),
      );
      expect(await projectContract.getContractBalance()).to.equal(0);
      await expect(projectContract.connect(address1).claimRefund()).to.be.revertedWith("Refund already claimed");
    });

    it("Non contributors cannot claim and creator cannot withdraw after abandonment", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("2") });
      await projectContract.connect(creator).createWithdrawRequest("Pending", etherToWei("1"), creator.address);
      await projectContract.connect(address1).approveWithdrawRequest(0);
      await increaseTime(61 * DAY);

      await expect(projectContract.connect(address2).claimRefund()).to.be.revertedWith("Only contributor can claim");
      await expect(projectContract.connect(creator).executeWithdrawRequest(0)).to.be.revertedWith(
        "Project funds are abandoned",
      );
      await expect(
        projectContract.connect(creator).createWithdrawRequest("New", etherToWei("1"), creator.address),
      ).to.be.revertedWith("Project funds are abandoned");
    });

    it("Creator activity after deadline postpones abandonment", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("2") });
      await increaseTime(50 * DAY); // deadline lewat 20 hari
      await projectContract.connect(creator).createWithdrawRequest("Late", etherToWei("1"), creator.address);

      await increaseTime(25 * DAY); // 45 hari setelah deadline, 25 hari setelah aktivitas terakhir
      expect(await projectContract.isAbandoned()).to.equal(false);
      await increaseTime(6 * DAY);
      expect(await projectContract.isAbandoned()).to.equal(true);
    });
  });
  describe("Donation message", async function () {
    it("Stores support message in FundingReceived event", async () => {
      const receipt = await (
        await projectContract.contribute(address1.address, "Semoga lancar!", { value: etherToWei("1") })
      ).wait();
      expect(receipt.events[0].args.message).to.equal("Semoga lancar!");
    });

    it("Rejects messages longer than 280 characters", async () => {
      await expect(
        projectContract.contribute(address1.address, "x".repeat(281), { value: etherToWei("1") }),
      ).to.be.revertedWith("Message is too long");
    });
  });

  describe("Edit campaign", async function () {
    it("Location starts from the constructor and cannot exceed 64 bytes", async () => {
      expect(await projectContract.location()).to.equal("Jawa Barat");
      await expect(projectContract.connect(creator).editCampaign("X", "Sosial", "", "x".repeat(65))).to.be.revertedWith(
        "Location is too long",
      );
    });

    it("Creator can edit description, category, and image", async () => {
      const receipt = await (
        await projectContract
          .connect(creator)
          .editCampaign("Deskripsi baru", "Kesehatan", "https://example.com/new.jpg", "Bali")
      ).wait();
      expect(receipt.events[0].args.location).to.equal("Bali");
      expect(await projectContract.location()).to.equal("Bali");
      expect(receipt.events[0].event).to.equal("CampaignEdited");
      expect(await projectContract.projectDescription()).to.equal("Deskripsi baru");
      expect(await projectContract.category()).to.equal("Kesehatan");
      expect(await projectContract.imageUrl()).to.equal("https://example.com/new.jpg");
      expect(await projectContract.projectTitle()).to.equal("Testing project");
    });

    it("Only creator, with category, and before deadline", async () => {
      await expect(projectContract.connect(address1).editCampaign("X", "Sosial", "", "Jawa Barat")).to.be.revertedWith(
        "Only creator can perform this action",
      );
      await expect(projectContract.connect(creator).editCampaign("X", "", "", "Jawa Barat")).to.be.revertedWith(
        "Category is required",
      );
      await increaseTime(31 * DAY);
      await expect(projectContract.connect(creator).editCampaign("X", "Sosial", "", "Jawa Barat")).to.be.revertedWith(
        "Deadline has passed",
      );
    });
  });

  describe("Extend deadline", async function () {
    it("Creator can extend once by at most 30 days", async () => {
      const deadline = await projectContract.deadline();
      await expect(projectContract.connect(creator).extendDeadline(deadline.add(30 * DAY + 1))).to.be.revertedWith(
        "Extension exceeds maximum",
      );
      await expect(projectContract.connect(creator).extendDeadline(deadline)).to.be.revertedWith(
        "New deadline must be later",
      );

      const receipt = await (await projectContract.connect(creator).extendDeadline(deadline.add(30 * DAY))).wait();
      expect(receipt.events[0].event).to.equal("DeadlineExtended");
      expect(receipt.events[0].args.previousDeadline).to.equal(deadline);
      expect(await projectContract.deadline()).to.equal(deadline.add(30 * DAY));
      expect(await projectContract.deadlineExtended()).to.equal(true);

      await expect(projectContract.connect(creator).extendDeadline(deadline.add(30 * DAY + 10))).to.be.revertedWith(
        "Deadline already extended",
      );
    });

    it("Extended deadline keeps donations open and postpones abandonment", async () => {
      const deadline = await projectContract.deadline();
      await projectContract.connect(creator).extendDeadline(deadline.add(20 * DAY));
      await increaseTime(40 * DAY); // lewat deadline lama, belum lewat deadline baru
      await projectContract.contribute(address1.address, "", { value: etherToWei("1") });
      expect(await projectContract.abandonedAt()).to.equal(deadline.add(50 * DAY));
    });

    it("Cannot extend when target reached, by non-creator, or after deadline", async () => {
      const deadline = await projectContract.deadline();
      await expect(projectContract.connect(address1).extendDeadline(deadline.add(DAY))).to.be.revertedWith(
        "Only creator can perform this action",
      );

      await projectContract.contribute(address1.address, "", { value: etherToWei("10") });
      await expect(projectContract.connect(creator).extendDeadline(deadline.add(DAY))).to.be.revertedWith(
        "Target already reached",
      );
    });

    it("Cannot extend after deadline passed", async () => {
      const deadline = await projectContract.deadline();
      await increaseTime(31 * DAY);
      await expect(projectContract.connect(creator).extendDeadline(deadline.add(DAY))).to.be.revertedWith(
        "Deadline has passed",
      );
    });
  });

  describe("Close funding early", async function () {
    it("Creator closes donations now and can still withdraw with approval", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("2") });
      const receipt = await (await projectContract.connect(creator).closeFunding()).wait();
      const closedAt = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

      expect(receipt.events[0].event).to.equal("FundingClosed");
      expect(await projectContract.closedEarly()).to.equal(true);
      expect(await projectContract.deadline()).to.equal(closedAt);
      expect(await projectContract.getCurrentState()).to.equal(1); // Expired
      expect(await projectContract.abandonedAt()).to.equal(closedAt + 30 * DAY);

      await expect(projectContract.contribute(address2.address, "", { value: etherToWei("1") })).to.be.revertedWith(
        "Deadline has passed",
      );
      await expect(projectContract.connect(creator).closeFunding()).to.be.revertedWith("Deadline has passed");

      await projectContract.connect(creator).createWithdrawRequest("Semua", etherToWei("2"), creator.address);
      await projectContract.connect(address1).approveWithdrawRequest(0);
      await expect(() => projectContract.connect(creator).executeWithdrawRequest(0)).to.changeEtherBalance(
        creator,
        etherToWei("2"),
      );
    });

    it("Only creator can close funding", async () => {
      await expect(projectContract.connect(address1).closeFunding()).to.be.revertedWith(
        "Only creator can perform this action",
      );
    });
  });

  describe("Cancel project", async function () {
    it("Creator cancels: donations & withdrawals stop, open requests cancelled, contributors refunded", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("6") });
      await projectContract.contribute(address2.address, "", { value: etherToWei("4") });
      await projectContract.connect(creator).createWithdrawRequest("Tahap 1", etherToWei("5"), creator.address);
      await projectContract.connect(address1).approveWithdrawRequest(0);
      await projectContract.connect(address2).approveWithdrawRequest(0);
      await projectContract.connect(creator).executeWithdrawRequest(0);
      await projectContract.connect(creator).createWithdrawRequest("Tahap 2", etherToWei("2"), creator.address);

      await expect(projectContract.connect(creator).cancelProject("")).to.be.revertedWith("Cancel reason is required");
      const receipt = await (await projectContract.connect(creator).cancelProject("Lokasi tidak bisa diakses")).wait();
      expect(receipt.events[0].event).to.equal("ProjectCancelled");
      expect(receipt.events[0].args.byAdmin).to.equal(false);
      expect(receipt.events[0].args.reason).to.equal("Lokasi tidak bisa diakses");
      expect(await projectContract.isCancelled()).to.equal(true);
      expect(await projectContract.cancelledByAdmin()).to.equal(false);
      expect(await projectContract.pendingWithdrawAmount()).to.equal(0);
      expect(await projectContract.getRequestStatus(0)).to.equal(3); // Completed tetap
      expect(await projectContract.getRequestStatus(1)).to.equal(4); // Cancelled

      await expect(projectContract.contribute(address1.address, "", { value: etherToWei("1") })).to.be.revertedWith(
        "Deadline has passed",
      );
      await expect(projectContract.connect(address1).approveWithdrawRequest(1)).to.be.revertedWith(
        "Project is cancelled",
      );
      await expect(projectContract.connect(creator).executeWithdrawRequest(1)).to.be.revertedWith(
        "Project is cancelled",
      );
      await expect(projectContract.connect(creator).cancelWithdrawRequest(1)).to.be.revertedWith(
        "Project is cancelled",
      );
      await expect(
        projectContract.connect(creator).createWithdrawRequest("Lagi", etherToWei("1"), creator.address),
      ).to.be.revertedWith("Project is cancelled");
      await expect(projectContract.connect(creator).cancelProject("Lagi")).to.be.revertedWith("Project is cancelled");

      // Sisa 5 ETH dibagi sesuai porsi donasi (60% / 40%)
      expect(await projectContract.isRefundOpen()).to.equal(true);
      await expect(() => projectContract.connect(address1).claimRefund()).to.changeEtherBalance(
        address1,
        etherToWei("3"),
      );
      await expect(() => projectContract.connect(address2).claimRefund()).to.changeEtherBalance(
        address2,
        etherToWei("2"),
      );
      expect(await projectContract.getContractBalance()).to.equal(0);
    });

    it("Creator can cancel after deadline; deadline stays unchanged", async () => {
      await projectContract.contribute(address1.address, "", { value: etherToWei("2") });
      const deadline = await projectContract.deadline();
      await increaseTime(31 * DAY);
      await projectContract.connect(creator).cancelProject("Batal");
      expect(await projectContract.deadline()).to.equal(deadline);
      expect(await projectContract.refundableAmount(address1.address)).to.equal(etherToWei("2"));
    });

    it("Only creator can cancel and only Crowdfunding can take down", async () => {
      await expect(projectContract.connect(address2).cancelProject("Batal")).to.be.revertedWith(
        "Only creator can perform this action",
      );
      await expect(projectContract.connect(address2).takedown("Penipuan")).to.be.revertedWith(
        "Contribute only through Crowdfunding contract",
      );

      // address1 men-deploy contract di test ini, sehingga berperan sebagai Crowdfunding
      const receipt = await (await projectContract.connect(address1).takedown("Penipuan")).wait();
      expect(receipt.events[0].args.byAdmin).to.equal(true);
      expect(await projectContract.cancelledByAdmin()).to.equal(true);
    });

    it("Cancel reason cannot exceed 1000 characters", async () => {
      await expect(projectContract.connect(creator).cancelProject("x".repeat(1001))).to.be.revertedWith(
        "Cancel reason is too long",
      );
    });
  });
});

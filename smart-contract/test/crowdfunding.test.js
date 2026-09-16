const { expect } = require("chai");
const { ethers } = require("hardhat");

const etherToWei = (n) => {
  return ethers.utils.parseUnits(n, "ether");
};

const DAY = 24 * 60 * 60;

// Deadline dalam detik, dihitung dari waktu blockchain
const futureDeadline = async (days = 30) => (await ethers.provider.getBlock("latest")).timestamp + days * DAY;

describe("Crowdfunding", () => {
  var address1;
  var address2;
  var crowdfundingContract;

  beforeEach(async function () {
    [address1, address2, ...address] = await ethers.getSigners();

    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    crowdfundingContract = await Crowdfunding.deploy();
  });

  describe("Request for funding", async function () {
    it("Start a project", async function () {
      const minimumContribution = etherToWei("1");
      const deadline = await futureDeadline();
      const targetContribution = etherToWei("100");
      const projectTitle = "Testing title";
      const projectDesc = "Testing description";

      const project = await crowdfundingContract
        .connect(address1)
        .createProject(
          minimumContribution,
          deadline,
          targetContribution,
          projectTitle,
          projectDesc,
          "Pendidikan",
          "https://example.com/cover.jpg",
          "Jawa Barat",
        );
      const event = await project.wait();

      const projectList = await crowdfundingContract.getAllProjects();

      // Test Event
      expect(event.events.length).to.equal(1);
      expect(event.events[0].event).to.equal("ProjectCreated");
      expect(event.events[0].args.projectAddress).to.equal(projectList[0]);
      expect(event.events[0].args.creator).to.equal(address1.address);
      expect(event.events[0].args.minContribution).to.equal(minimumContribution);
      expect(Number(event.events[0].args.projectDeadline)).to.greaterThan(0);
      expect(event.events[0].args.goalAmount).to.equal(targetContribution);
      expect(event.events[0].args.title).to.equal(projectTitle);
      expect(event.events[0].args.description).to.equal(projectDesc);
    });

    it("Should fail if deadline is in the past", async function () {
      const pastDeadline = (await ethers.provider.getBlock("latest")).timestamp - DAY;
      await expect(
        crowdfundingContract
          .connect(address1)
          .createProject(
            etherToWei("1"),
            pastDeadline,
            etherToWei("100"),
            "Testing title",
            "Testing description",
            "Pendidikan",
            "https://example.com/cover.jpg",
            "Jawa Barat",
          ),
      ).to.be.revertedWith("Deadline must be in the future");
    });

    it("Should fail if minimum contribution or target is invalid", async function () {
      const deadline = await futureDeadline();
      await expect(
        crowdfundingContract
          .connect(address1)
          .createProject(
            0,
            deadline,
            etherToWei("10"),
            "Title",
            "Desc",
            "Pendidikan",
            "https://example.com/cover.jpg",
            "Jawa Barat",
          ),
      ).to.be.revertedWith("Minimum contribution must be greater than 0");
      await expect(
        crowdfundingContract
          .connect(address1)
          .createProject(
            etherToWei("1"),
            deadline,
            0,
            "Title",
            "Desc",
            "Pendidikan",
            "https://example.com/cover.jpg",
            "Jawa Barat",
          ),
      ).to.be.revertedWith("Target contribution must be greater than 0");
      await expect(
        crowdfundingContract
          .connect(address1)
          .createProject(
            etherToWei("11"),
            deadline,
            etherToWei("10"),
            "Title",
            "Desc",
            "Pendidikan",
            "https://example.com/cover.jpg",
            "Jawa Barat",
          ),
      ).to.be.revertedWith("Minimum contribution cannot exceed target");
      await expect(
        crowdfundingContract
          .connect(address1)
          .createProject(
            etherToWei("1"),
            deadline,
            etherToWei("10"),
            "",
            "Desc",
            "Pendidikan",
            "https://example.com/cover.jpg",
            "Jawa Barat",
          ),
      ).to.be.revertedWith("Title is required");
    });

    it("Should fail if creator contributes to own project through Crowdfunding", async function () {
      await crowdfundingContract
        .connect(address1)
        .createProject(
          etherToWei("1"),
          await futureDeadline(),
          etherToWei("10"),
          "Title",
          "Desc",
          "Pendidikan",
          "https://example.com/cover.jpg",
          "Jawa Barat",
        );
      const projectList = await crowdfundingContract.getAllProjects();
      await expect(
        crowdfundingContract.connect(address1).contribute(projectList[0], "", { value: etherToWei("1") }),
      ).to.be.revertedWith("Creator cannot contribute to own project");
    });

    it("Get data", async function () {
      const minimumContribution = etherToWei("1");
      const deadline = await futureDeadline();
      const targetContribution = etherToWei("100");
      const projectTitle = "Testing title";
      const projectDesc = "Testing description";

      await crowdfundingContract
        .connect(address1)
        .createProject(
          minimumContribution,
          deadline,
          targetContribution,
          projectTitle,
          projectDesc,
          "Pendidikan",
          "https://example.com/cover.jpg",
          "Jawa Barat",
        );
      const projectList = await crowdfundingContract.getAllProjects();
      const contribute = await crowdfundingContract
        .connect(address2)
        .contribute(projectList[0], "", { value: etherToWei("4") });

      const event = await contribute.wait();
      // Test ContributionReceived event
      expect(event.events.length).to.equal(2);
      const contribution = event.events.find((item) => item.event === "ContributionReceived");
      expect(contribution.args.projectAddress).to.equal(projectList[0]);
      expect(contribution.args.amount).to.equal(etherToWei("4"));
      expect(contribution.args.contributor).to.equal(address2.address);
      expect(contribution.args.message).to.equal("");
    });

    it("Should fail to contribute to address that is not a project", async function () {
      await expect(
        crowdfundingContract.connect(address1).contribute(address2.address, "", { value: etherToWei("1") }),
      ).to.be.revertedWith("Project not found");
    });
  });
  describe("Moderation", async function () {
    var projectAddress;
    const REPORT_REASON = "Deskripsi tidak sesuai kenyataan";

    beforeEach(async function () {
      await crowdfundingContract
        .connect(address1)
        .createProject(
          etherToWei("1"),
          await futureDeadline(),
          etherToWei("10"),
          "Title",
          "Desc",
          "Kesehatan",
          "",
          "Jawa Barat",
        );
      [projectAddress] = await crowdfundingContract.getAllProjects();
    });

    it("Stores category and optional image URL", async function () {
      const project = await ethers.getContractAt("Project", projectAddress);
      expect(await project.category()).to.equal("Kesehatan");
      expect(await project.imageUrl()).to.equal("");
    });

    it("Requires a category", async function () {
      await expect(
        crowdfundingContract
          .connect(address1)
          .createProject(
            etherToWei("1"),
            await futureDeadline(),
            etherToWei("10"),
            "Title",
            "Desc",
            "",
            "",
            "Jawa Barat",
          ),
      ).to.be.revertedWith("Category is required");
    });

    it("Deployer is admin and can verify projects", async function () {
      const [deployer] = await ethers.getSigners();
      expect(await crowdfundingContract.owner()).to.equal(deployer.address);

      const receipt = await (await crowdfundingContract.setVerified(projectAddress, true)).wait();
      expect(receipt.events[0].event).to.equal("ProjectVerified");
      expect(await crowdfundingContract.isVerified(projectAddress)).to.equal(true);

      await crowdfundingContract.setVerified(projectAddress, false);
      expect(await crowdfundingContract.isVerified(projectAddress)).to.equal(false);
    });

    it("Only admin can verify", async function () {
      await expect(crowdfundingContract.connect(address2).setVerified(projectAddress, true)).to.be.revertedWith(
        "Only admin can perform this action",
      );
    });

    it("Anyone except creator can report once with a reason", async function () {
      const receipt = await (
        await crowdfundingContract.connect(address2).reportProject(projectAddress, REPORT_REASON)
      ).wait();
      expect(receipt.events[0].event).to.equal("ProjectReported");
      expect(receipt.events[0].args.reason).to.equal(REPORT_REASON);
      expect(await crowdfundingContract.reportCount(projectAddress)).to.equal(1);
      expect(await crowdfundingContract.hasReported(projectAddress, address2.address)).to.equal(true);

      await expect(
        crowdfundingContract.connect(address2).reportProject(projectAddress, REPORT_REASON),
      ).to.be.revertedWith("You already reported this project");
      await expect(
        crowdfundingContract.connect(address1).reportProject(projectAddress, REPORT_REASON),
      ).to.be.revertedWith("Creator cannot report own project");
      await expect(crowdfundingContract.connect(address[0]).reportProject(projectAddress, "")).to.be.revertedWith(
        "Report reason is required",
      );
      await expect(
        crowdfundingContract.connect(address[0]).reportProject(address2.address, REPORT_REASON),
      ).to.be.revertedWith("Project not found");
    });
  });
  describe("Donation message", async function () {
    it("Forwards support message to ContributionReceived and FundingReceived", async function () {
      await crowdfundingContract
        .connect(address1)
        .createProject(
          etherToWei("1"),
          await futureDeadline(),
          etherToWei("10"),
          "Title",
          "Desc",
          "Sosial",
          "",
          "Jawa Barat",
        );
      const [projectAddress] = await crowdfundingContract.getAllProjects();
      const receipt = await (
        await crowdfundingContract.connect(address2).contribute(projectAddress, "Semangat!", { value: etherToWei("1") })
      ).wait();

      const contribution = receipt.events.find((item) => item.event === "ContributionReceived");
      expect(contribution.args.message).to.equal("Semangat!");

      const project = await ethers.getContractAt("Project", projectAddress);
      const [funding] = await project.queryFilter(project.filters.FundingReceived());
      expect(funding.args.message).to.equal("Semangat!");
    });
  });

  describe("Takedown", async function () {
    var projectAddress;
    var project;

    beforeEach(async function () {
      await crowdfundingContract
        .connect(address2)
        .createProject(
          etherToWei("1"),
          await futureDeadline(),
          etherToWei("10"),
          "Title",
          "Desc",
          "Sosial",
          "",
          "Jawa Barat",
        );
      [projectAddress] = await crowdfundingContract.getAllProjects();
      project = await ethers.getContractAt("Project", projectAddress);
      await crowdfundingContract.connect(address[0]).contribute(projectAddress, "", { value: etherToWei("3") });
      await crowdfundingContract.setVerified(projectAddress, true);
    });

    it("Admin takes down a project: verified badge removed, project cancelled, donors refunded", async function () {
      const receipt = await (await crowdfundingContract.takedownProject(projectAddress, "Penipuan")).wait();
      const names = receipt.events.map((item) => item.event).filter(Boolean);
      expect(names).to.include.members(["ProjectVerified", "ProjectTakenDown"]);

      expect(await crowdfundingContract.isTakenDown(projectAddress)).to.equal(true);
      expect(await crowdfundingContract.isVerified(projectAddress)).to.equal(false);
      expect(await project.isCancelled()).to.equal(true);
      expect(await project.cancelledByAdmin()).to.equal(true);

      const [cancelled] = await project.queryFilter(project.filters.ProjectCancelled());
      expect(cancelled.args.reason).to.equal("Penipuan");

      await expect(
        crowdfundingContract.connect(address[0]).contribute(projectAddress, "", { value: etherToWei("1") }),
      ).to.be.revertedWith("Deadline has passed");
      await expect(() => project.connect(address[0]).claimRefund()).to.changeEtherBalance(address[0], etherToWei("3"));
    });

    it("Only admin, with a reason, and only once", async function () {
      await expect(
        crowdfundingContract.connect(address2).takedownProject(projectAddress, "Penipuan"),
      ).to.be.revertedWith("Only admin can perform this action");
      await expect(crowdfundingContract.takedownProject(projectAddress, "")).to.be.revertedWith(
        "Cancel reason is required",
      );
      await expect(crowdfundingContract.takedownProject(address2.address, "Penipuan")).to.be.revertedWith(
        "Project not found",
      );

      await crowdfundingContract.setVerified(projectAddress, false);
      const receipt = await (await crowdfundingContract.takedownProject(projectAddress, "Penipuan")).wait();
      expect(receipt.events.filter((item) => item.event === "ProjectVerified")).to.have.length(0);
      await expect(crowdfundingContract.takedownProject(projectAddress, "Lagi")).to.be.revertedWith(
        "Project is cancelled",
      );
    });
  });

  describe("Display name", async function () {
    it("Anyone can set, change, and clear a display name", async function () {
      const receipt = await (await crowdfundingContract.connect(address2).setDisplayName("Yayasan Pelita")).wait();
      expect(receipt.events[0].event).to.equal("DisplayNameChanged");
      expect(receipt.events[0].args.account).to.equal(address2.address);
      expect(await crowdfundingContract.displayName(address2.address)).to.equal("Yayasan Pelita");

      await crowdfundingContract.connect(address2).setDisplayName("");
      expect(await crowdfundingContract.displayName(address2.address)).to.equal("");
    });

    it("Rejects names longer than 32 bytes", async function () {
      await expect(crowdfundingContract.setDisplayName("x".repeat(33))).to.be.revertedWith("Name is too long");
    });
  });

  describe("Location", async function () {
    it("Stores province in the project and ProjectCreated event", async function () {
      const receipt = await (
        await crowdfundingContract
          .connect(address1)
          .createProject(etherToWei("1"), await futureDeadline(), etherToWei("10"), "T", "D", "Sosial", "", "Bali")
      ).wait();
      expect(receipt.events[0].args.location).to.equal("Bali");
      const [projectAddress] = await crowdfundingContract.getAllProjects();
      const project = await ethers.getContractAt("Project", projectAddress);
      expect(await project.location()).to.equal("Bali");
    });

    it("Rejects locations longer than 64 bytes", async function () {
      await expect(
        crowdfundingContract
          .connect(address1)
          .createProject(
            etherToWei("1"),
            await futureDeadline(),
            etherToWei("10"),
            "T",
            "D",
            "Sosial",
            "",
            "x".repeat(65),
          ),
      ).to.be.revertedWith("Location is too long");
    });
  });

  describe("Takedown appeal", async function () {
    const DAY = 24 * 60 * 60;
    const increaseTime = async (seconds) => {
      await ethers.provider.send("evm_increaseTime", [seconds]);
      await ethers.provider.send("evm_mine", []);
    };
    var creator;
    var projectAddress;
    var project;

    beforeEach(async function () {
      creator = address2;
      await crowdfundingContract
        .connect(creator)
        .createProject(etherToWei("1"), await futureDeadline(), etherToWei("10"), "T", "D", "Sosial", "", "Bali");
      [projectAddress] = await crowdfundingContract.getAllProjects();
      project = await ethers.getContractAt("Project", projectAddress);
      await crowdfundingContract.connect(address[0]).contribute(projectAddress, "", { value: etherToWei("2") });
    });

    it("Cannot appeal a project that is not taken down", async function () {
      await expect(
        crowdfundingContract.connect(creator).appealTakedown(projectAddress, "Salah paham"),
      ).to.be.revertedWith("Project is not taken down");
    });

    it("Creator appeals once; admin accepts: takedown label removed but project stays cancelled with refunds", async function () {
      await crowdfundingContract.takedownProject(projectAddress, "Dokumen palsu");
      const takedownBlock = await ethers.provider.getBlock("latest");
      expect(await crowdfundingContract.takenDownAt(projectAddress)).to.equal(takedownBlock.timestamp);

      await expect(
        crowdfundingContract.connect(address1).appealTakedown(projectAddress, "Bukan penipuan"),
      ).to.be.revertedWith("Only creator can appeal");
      await expect(crowdfundingContract.connect(creator).appealTakedown(projectAddress, "")).to.be.revertedWith(
        "Appeal reason is required",
      );
      await expect(
        crowdfundingContract.connect(creator).appealTakedown(projectAddress, "x".repeat(1001)),
      ).to.be.revertedWith("Appeal reason is too long");
      await expect(crowdfundingContract.resolveAppeal(projectAddress, true, "OK")).to.be.revertedWith(
        "No pending appeal",
      );

      const appeal = await (
        await crowdfundingContract.connect(creator).appealTakedown(projectAddress, "Dokumen asli terlampir")
      ).wait();
      expect(appeal.events[0].event).to.equal("TakedownAppealed");
      expect(appeal.events[0].args.reason).to.equal("Dokumen asli terlampir");
      expect(await crowdfundingContract.appealStatus(projectAddress)).to.equal(1); // Pending

      await expect(crowdfundingContract.connect(creator).appealTakedown(projectAddress, "Lagi")).to.be.revertedWith(
        "Appeal already submitted",
      );
      await expect(crowdfundingContract.connect(creator).resolveAppeal(projectAddress, true, "OK")).to.be.revertedWith(
        "Only admin can perform this action",
      );
      await expect(crowdfundingContract.resolveAppeal(projectAddress, true, "")).to.be.revertedWith(
        "Decision note is required",
      );
      await expect(crowdfundingContract.resolveAppeal(projectAddress, true, "x".repeat(1001))).to.be.revertedWith(
        "Decision note is too long",
      );

      const resolved = await (
        await crowdfundingContract.resolveAppeal(projectAddress, true, "Dokumen terverifikasi asli")
      ).wait();
      expect(resolved.events[0].event).to.equal("AppealResolved");
      expect(resolved.events[0].args.accepted).to.equal(true);
      expect(await crowdfundingContract.appealStatus(projectAddress)).to.equal(2); // Accepted
      expect(await crowdfundingContract.isTakenDown(projectAddress)).to.equal(false);

      expect(await project.isCancelled()).to.equal(true);
      expect(await project.isRefundOpen()).to.equal(true);
      await expect(() => project.connect(address[0]).claimRefund()).to.changeEtherBalance(address[0], etherToWei("2"));
      await expect(crowdfundingContract.resolveAppeal(projectAddress, false, "Lagi")).to.be.revertedWith(
        "No pending appeal",
      );
    });

    it("Admin rejects an appeal: project stays taken down", async function () {
      await crowdfundingContract.takedownProject(projectAddress, "Dokumen palsu");
      await crowdfundingContract.connect(creator).appealTakedown(projectAddress, "Mohon ditinjau");
      await crowdfundingContract.resolveAppeal(projectAddress, false, "Bukti tidak cukup");
      expect(await crowdfundingContract.appealStatus(projectAddress)).to.equal(3); // Rejected
      expect(await crowdfundingContract.isTakenDown(projectAddress)).to.equal(true);
      await expect(crowdfundingContract.connect(creator).appealTakedown(projectAddress, "Lagi")).to.be.revertedWith(
        "Appeal already submitted",
      );
    });

    it("Appeal must be submitted within 14 days of the takedown", async function () {
      await crowdfundingContract.takedownProject(projectAddress, "Dokumen palsu");
      await increaseTime(14 * DAY + 60);
      await expect(
        crowdfundingContract.connect(creator).appealTakedown(projectAddress, "Terlambat"),
      ).to.be.revertedWith("Appeal period has ended");
    });
  });
});

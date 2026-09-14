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
        .createProject(minimumContribution, deadline, targetContribution, projectTitle, projectDesc);
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
          .createProject(etherToWei("1"), pastDeadline, etherToWei("100"), "Testing title", "Testing description"),
      ).to.be.revertedWith("Deadline must be in the future");
    });

    it("Should fail if minimum contribution or target is invalid", async function () {
      const deadline = await futureDeadline();
      await expect(
        crowdfundingContract.connect(address1).createProject(0, deadline, etherToWei("10"), "Title", "Desc"),
      ).to.be.revertedWith("Minimum contribution must be greater than 0");
      await expect(
        crowdfundingContract.connect(address1).createProject(etherToWei("1"), deadline, 0, "Title", "Desc"),
      ).to.be.revertedWith("Target contribution must be greater than 0");
      await expect(
        crowdfundingContract
          .connect(address1)
          .createProject(etherToWei("11"), deadline, etherToWei("10"), "Title", "Desc"),
      ).to.be.revertedWith("Minimum contribution cannot exceed target");
      await expect(
        crowdfundingContract.connect(address1).createProject(etherToWei("1"), deadline, etherToWei("10"), "", "Desc"),
      ).to.be.revertedWith("Title is required");
    });

    it("Should fail if creator contributes to own project through Crowdfunding", async function () {
      await crowdfundingContract
        .connect(address1)
        .createProject(etherToWei("1"), await futureDeadline(), etherToWei("10"), "Title", "Desc");
      const projectList = await crowdfundingContract.getAllProjects();
      await expect(
        crowdfundingContract.connect(address1).contribute(projectList[0], { value: etherToWei("1") }),
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
        .createProject(minimumContribution, deadline, targetContribution, projectTitle, projectDesc);
      const projectList = await crowdfundingContract.getAllProjects();
      const contribute = await crowdfundingContract
        .connect(address2)
        .contribute(projectList[0], { value: etherToWei("4") });

      const event = await contribute.wait();
      // Test ContributionReceived event
      expect(event.events.length).to.equal(2);
      expect(event.events[1].event).to.equal("ContributionReceived");
      expect(event.events[1].args.projectAddress).to.equal(projectList[0]);
      expect(event.events[1].args.amount).to.equal(etherToWei("4"));
      expect(event.events[1].args.contributor).to.equal(address2.address);
    });

    it("Should fail to contribute to address that is not a project", async function () {
      await expect(
        crowdfundingContract.connect(address1).contribute(address2.address, { value: etherToWei("1") }),
      ).to.be.revertedWith("Project not found");
    });
  });
});

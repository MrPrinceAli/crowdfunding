// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.24;

import "./Project.sol";

/**
 * @title Crowdfunding
 * @notice Registry kampanye: membuat kampanye baru dan meneruskan donasi ke contract Project.
 */
contract Crowdfunding {
    Project[] private projects;

    /// Hanya project yang dibuat lewat platform ini yang bisa menerima donasi
    mapping(address => bool) public isProject;

    event ProjectCreated(
        address projectAddress,
        address creator,
        uint256 minContribution,
        uint256 projectDeadline,
        uint256 goalAmount,
        string title,
        string description
    );

    event ContributionReceived(address projectAddress, uint256 amount, address indexed contributor);

    function createProject(
        uint256 _minimumContribution,
        uint256 _deadline,
        uint256 _targetContribution,
        string memory _title,
        string memory _description
    ) external {
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(_minimumContribution > 0, "Minimum contribution must be greater than 0");
        require(_targetContribution > 0, "Target contribution must be greater than 0");
        require(_minimumContribution <= _targetContribution, "Minimum contribution cannot exceed target");
        require(bytes(_title).length > 0, "Title is required");

        Project project = new Project(
            msg.sender,
            _minimumContribution,
            _deadline,
            _targetContribution,
            _title,
            _description
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
            _description
        );
    }

    function getAllProjects() external view returns (Project[] memory) {
        return projects;
    }

    /// @notice Donasi ke kampanye; validasi minimum donasi & deadline dilakukan di contract Project
    function contribute(address _projectAddress) external payable {
        require(isProject[_projectAddress], "Project not found");

        Project(_projectAddress).contribute{value: msg.value}(msg.sender);

        emit ContributionReceived(_projectAddress, msg.value, msg.sender);
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const sdk_1 = require("@linear/sdk");
const octokit_1 = require("octokit");
const github_linear_users_config_1 = require("./github-linear-users-config");
const GH_ID_PREFIX = "GH-ID:";
function shouldCloseIssueAfterUpdate(body) {
    if (body.action !== "update") {
        return false;
    }
    if (body.updatedFrom.canceledAt === null) {
        return true;
    }
    if (body.updatedFrom.stateId !== undefined &&
        (body.data.state.type === "canceled" ||
            body.data.state.type === "completed")) {
        return true;
    }
    return false;
}
function shouldCloseIssueAfterRemove(body) {
    return body.action === "remove";
}
function shouldUpdateAssignees(body) {
    if (body.action !== "update") {
        return false;
    }
    if (body.updatedFrom.assigneeId !== undefined) {
        return true;
    }
    return false;
}
function shouldOpenIssueAfterBeingRestored(body) {
    return body.action === "restore";
}
function shouldOpenIssueAfterUpdate(body) {
    if (body.action !== "update") {
        return false;
    }
    if (body.updatedFrom.stateId !== undefined &&
        !(body.data.state.type === "canceled" ||
            body.data.state.type === "completed")) {
        return true;
    }
    return false;
}
function getGithubIssueIdFromDescription(body) {
    const description = body.data.description;
    if (!description.includes(GH_ID_PREFIX)) {
        return undefined;
    }
    const line = description.split("\n").find((l) => l.includes(GH_ID_PREFIX));
    const ghId = line.slice(GH_ID_PREFIX.length).trim();
    const [tag, ns] = ghId.split("#");
    const n = +ns;
    const [owner, repo] = tag.split("/");
    if (Number.isNaN(n) || owner === undefined || repo === undefined) {
        return undefined;
    }
    return { owner, repo, issue_number: n };
}
function getGithubAssignee(body) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const linearAssignee = body.data.assignee;
        if (linearAssignee === null || linearAssignee === undefined) {
            return undefined;
        }
        const client = new sdk_1.LinearClient({ apiKey: process.env.LINEAR_API_KEY });
        const user = yield client.user(linearAssignee.id);
        const displayName = user.displayName;
        const login = github_linear_users_config_1.LINEAR_DISPLAY_NAME_TO_GH_LOGIN[displayName];
        if (login === undefined) {
            throw Error(`Linear user ${displayName} not configured`);
        }
        return login;
    });
}
function getOctokit() {
    return new octokit_1.Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });
}
function closeGithubIssue(ghId) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const octokit = getOctokit();
        yield octokit.rest.issues.update(Object.assign(Object.assign({}, ghId), { state: "closed" }));
    });
}
function openGithubIssue(ghId) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const octokit = getOctokit();
        yield octokit.rest.issues.update(Object.assign(Object.assign({}, ghId), { state: "open" }));
    });
}
function removeGithubIssueAssignees(ghId, exception) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const octokit = getOctokit();
        const assigneesData = yield octokit.rest.issues.listAssignees(Object.assign({}, ghId));
        const assignees = assigneesData.data
            .map((a) => a.login)
            .filter((l) => l !== exception);
        yield octokit.rest.issues.removeAssignees(Object.assign(Object.assign({}, ghId), { assignees }));
    });
}
function addGithubIssueAssignee(ghId, assigneeLogin) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const octokit = getOctokit();
        yield octokit.rest.issues.addAssignees(Object.assign(Object.assign({}, ghId), { assignees: [assigneeLogin] }));
    });
}
exports.default = (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        const ghId = getGithubIssueIdFromDescription(req.body);
        if (ghId === undefined) {
            console.log("No associated GH issue found");
            return;
        }
        if (shouldCloseIssueAfterRemove(req.body) ||
            shouldCloseIssueAfterUpdate(req.body)) {
            console.log("Closing Github issue");
            yield closeGithubIssue(ghId);
        }
        if (shouldOpenIssueAfterBeingRestored(req.body) ||
            shouldOpenIssueAfterUpdate(req.body)) {
            console.log("Reopening Github issue");
            yield openGithubIssue(ghId);
        }
        if (shouldUpdateAssignees(req.body)) {
            console.log("Updating Github issue assignees");
            const assignee = yield getGithubAssignee(req.body);
            yield removeGithubIssueAssignees(ghId, assignee);
            if (assignee !== undefined) {
                console.log(`Assigning ${assignee}`);
                yield addGithubIssueAssignee(ghId, assignee);
            }
        }
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
});

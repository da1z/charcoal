import { describe, expect, it } from "bun:test";
import { getReviewers } from "../../../src/actions/submit/reviewers";

describe("reviewers.ts unit tests", () => {
	it("should return empty list when the value of reviewers is undefined", () => {
		expect(getReviewers(undefined)).resolves.toEqual([]);
	});

	it("should parse reviewers when the value of reviewers is a string", () => {
		expect(getReviewers("user1,user2")).resolves.toEqual(["user1", "user2"]);

		// Test can handle extra spaces
		expect(getReviewers("user3, user4")).resolves.toEqual(["user3", "user4"]);
	});
});

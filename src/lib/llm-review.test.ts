/**
 * LLM-as-Judge usage examples
 * 
 * Ralph learns from these patterns to apply non-deterministic backpressure
 * for subjective criteria (tone, aesthetics, UX quality).
 */

import { createReview } from "./llm-review";

// Example 1: Text evaluation
test("welcome message tone", async () => {
  const message = generateWelcomeMessage();
  const result = await createReview({
    criteria:
      "Message uses warm, conversational tone appropriate for design professionals while clearly conveying value proposition",
    artifact: message, // Text content
  });
  expect(result.pass).toBe(true);
});

// Example 2: Vision evaluation (screenshot path)
test("dashboard visual hierarchy", async () => {
  // In a real test, you'd capture a screenshot first
  // await page.screenshot({ path: "./tmp/dashboard.png" });
  
  const result = await createReview({
    criteria:
      "Layout demonstrates clear visual hierarchy with obvious primary action",
    artifact: "./tmp/dashboard.png", // Screenshot path
  });
  expect(result.pass).toBe(true);
});

// Example 3: Smart intelligence for complex judgment
test("brand visual consistency", async () => {
  // await page.screenshot({ path: "./tmp/homepage.png" });
  
  const result = await createReview({
    criteria:
      "Visual design maintains professional brand identity suitable for financial services while avoiding corporate sterility",
    artifact: "./tmp/homepage.png",
    intelligence: "smart", // Complex aesthetic judgment requires higher quality model
  });
  expect(result.pass).toBe(true);
});

// Helper function (example)
function generateWelcomeMessage(): string {
  return "Welcome to our design platform! Create beautiful mood boards with ease.";
}

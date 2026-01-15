You are a product requirements document generator for AI-agent-driven development projects. Generate two complete, production-ready markdown documents based on the provided product information.

## Product Information

- **Product Name**: ${PRODUCT_NAME}
- **Problem Statement**: ${PROBLEM_STATEMENT}
- **Target Audience**: ${TARGET_AUDIENCE}
- **Key Capabilities**:
${KEY_CAPABILITIES}

---

## Instructions

Generate two complete markdown documents. Fill in ALL sections thoughtfully based on the product information provided. Do NOT leave placeholder brackets like [text] - generate actual, specific content for everything.

IMPORTANT: Do NOT include timeline, budget, or deadline constraints anywhere. These are not relevant for AI agent implementation.

---

### DOCUMENT 1: PRD.md

Generate a PRD with the following structure:

# Product Requirements Document

## Product Overview

**One-Sentence Description**: [Generate a compelling one-sentence description based on product name and problem]

**Problem Statement**: [Expand on the provided problem statement]

**Solution**: [Describe how the product solves the problem using the key capabilities]

**Vision**: [Describe what success looks like in 6-12 months]

## Goals & Success Metrics

### Primary Goals

[Generate 2-3 measurable goals based on the problem and capabilities]

1. **[Goal Name]**
   - **Metric**: [How to measure]
   - **Target**: [Success threshold]

### Key Metrics

[Generate relevant metrics for the product]

## Scope

### In Scope

[List the key capabilities provided as in-scope items]

### Out of Scope (for now)

[Suggest reasonable exclusions based on the capabilities - things that could be added later but aren't core]

### Constraints

- **Technical**: [Derive from capabilities - reasonable technical constraints]
- **Regulatory**: [If applicable based on audience and capabilities]

NOTE: Business constraints, deadlines, and budgets are NOT included as this is for AI agent implementation.

## Core Capabilities

[Expand each key capability provided into a full capability section]

1. **[Capability Name]**
   - **Purpose**: [Why this capability exists]
   - **Specs**: `specs/[derived-spec-name].md`
   - **Dependencies**: [Other capabilities or external systems]

## Audience & Jobs to Be Done

See `AUDIENCE_JTBD.md` for detailed audience analysis and jobs-to-be-done.

**Primary Audience**: [Summary from target audience provided]

**Key JTBDs**:
[Derive 2-3 key jobs from the problem and capabilities]

## Technical Considerations

### Technology Stack

[Suggest based on capabilities, or note "To be determined based on implementation"]

### Integrations

[If any integrations are implied by capabilities]

### Performance Requirements

[Reasonable defaults based on the product type]

### Security & Privacy

[Reasonable requirements based on audience and capabilities]

## Risks & Mitigations

[Generate 2-3 realistic risks with mitigations]

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|

## Open Questions

[Generate 2-3 questions that should be answered during implementation]

## Release Strategy

### Initial Release (SLC)

**Simple**: [Narrow first scope focusing on core value]

**Lovable**: [What makes people want to use it]

**Complete**: [What job it fully accomplishes]

### Future Releases

[Suggest 2-3 future enhancements]

## References

- **Audience Analysis**: `AUDIENCE_JTBD.md`
- **Feature Specs**: `specs/`
- **Implementation Plan**: `IMPLEMENTATION_PLAN.md` (AI-generated)
- **Build & Run**: `AGENTS.md`

---

### DOCUMENT 2: AUDIENCE_JTBD.md

Generate an audience analysis with the following structure:

# Audience & Jobs to Be Done

## Primary Audience

[Expand on the target audience provided - who they are, their context, their needs]

### Jobs to Be Done

For [audience name]:

[Generate 3-5 JTBDs based on the problem and capabilities]

1. **[JTBD Name]**
   - **Outcome**: [What success looks like]
   - **Context**: [When/why they need this]

## Connected Audiences

[If applicable based on the product, suggest secondary audiences]

### [Secondary Audience Name]

**Relationship**: [How they connect to primary audience]

**Jobs to Be Done**:
1. **[JTBD Name]**
   - **Outcome**: [What success looks like]

## Notes

[Any relevant context about audience needs derived from the inputs]

---

## Output Format

CRITICAL: Output the documents in EXACTLY this format for parsing. Include the delimiters exactly as shown:

===PRD_START===
[Full PRD.md content here - the complete document]
===PRD_END===

===AUDIENCE_START===
[Full AUDIENCE_JTBD.md content here - the complete document]
===AUDIENCE_END===

# Judge Q&A Prep

Five minutes means about five questions. Keep each answer under 30 seconds and end on the proof you can show.

## 1. How do you enforce that answers come only from the organizers' documents?

- Three layers: retrieval is limited to organizer files; the prompt allows only retrieved chunks as context; a gate refuses when the match score is low.
- Output check: an answer without a citation to a retrieved chunk is blocked and replaced with the fallback.
- Proof: show the refusal for "esports scholarship" and the test-set results.

## 2. How does this scale to dozens of college departments?

- Each chunk and announcement has a tenant tag, so adding a department means adding a tag, its admins, and its files. No code change.
- Retrieval filters by tag before search, so latency and noise stay flat as content grows.
- The sources already show the shape: university-wide files (scholarships, offices) plus per-college requirement files (CCIS).

## 3. How do you prevent hallucinations and prompt injection?

- Hallucination: strict grounding, threshold refusal, mandatory citations, and conflict flagging when sources disagree.
- Injection: documents and questions are passed as data in delimited blocks; the system rules cannot be overridden by their content; no tools or actions are exposed to the model.
- Honest limit: no filter is perfect, so we log refusals and low-score answers for admin review.

## 4. How was this built on-site within the time limit?

- State plainly that all code was written during the event window, with AI-assisted coding as the rules allow, and show the timestamped commit history from kickoff.
- Scope was cut to the P0 list in the PRD: grounded chat, college filter, banner editor, gap list.
- Planning documents (the PRD, the pitch outline) are not code. Do not bring any prototype, repo or starter code made before the event.

## 5. What is the admin workflow for monthly updates?

- Log in, choose the college, then open the banner editor: title, body, audience, dates. Pick a seasonal preset if relevant. Publish. Target: under 5 minutes.
- To change AI knowledge, upload or replace a source file; the uploaded version becomes available when its upload completes.
- Afterwards, open the gap list to see which student questions were refused and what to upload next.

## Bonus if asked: "What if the sources are wrong?"

The bot flags conflicts between sources (we found several in the provided files), and it cites the exact section, so the owning office can correct the source and the answer updates on re-upload.

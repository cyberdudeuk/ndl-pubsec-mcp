# The case against (internal)

The strongest arguments against this work, and the answers to them. Kept in the repository, not on the published page.

**1. "It gets ahead of the GDS discoverability platform decision due in December."**
It is a prototype that produces evidence for that decision, not a rival platform. It holds no data, runs nowhere and can be dropped without loss. *Action: present it as input to the decision.*

**2. "Most target users cannot use MCP: they lack AI licences at work."**
True for many departments today. The validator and crosswalk are plain TypeScript functions, usable without MCP, and could back a web form or a CI check for catalogue owners. *Action: test with users who have licences, and keep the core usable without them.*

**3. "A validator that agrees with 32 examples is not proven."**
Agreed. The corpus is small, and several invalid examples break more than one rule. Each rule is unit-tested on its own. A differential test of 45 varied records and a sample of 50 real catalogue records both agree fully with `linkml-validate` (O-02, O-05), though the real sample is not random. The README claims only what was measured.

**4. "data.gov.uk is not where most government metadata lives."**
Base rate: much departmental data is held in internal catalogues, not data.gov.uk. The catalogue client is configurable, and departmental DCAT catalogues are on the roadmap. The value at alpha is the validator, not catalogue coverage.

**5. "The owner authored xGov MEM, so this is self-promotion."**
The validator is generated from the published model and tested against the model's own corpus, so it gives no special treatment. The one place the owner's view enters, the contact form question, is raised openly as O-08.

**6. "Two repositories invite confusion."**
They have different owners in law (Crown and personal), different audiences and different licences. ADR 0002 sets a one-way rule: personal to official, only after review.

**Limits of the sources:** no user research yet, and the live API was not called from the build environment. Standards entries labelled S or U are leads, not facts.

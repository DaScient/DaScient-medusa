# 00 — Legal Notice & Intellectual-Property Designation

**Document:** Legal Notice & IP Designation
**Part of:** V-Channel Commerce & Entitlement Protocol (VCEP) Documentation Package
**Edition date:** June 23, 2026
**Classification:** V-Channel, Inc. Proprietary Intellectual Artifact

---

## 1. Proprietary designation

The **V-Channel Commerce & Entitlement Protocol** (the "Protocol" or "VCEP"),
together with this documentation package, all accompanying diagrams,
specifications, data models, workflow designs, interface contracts, and the
organization and selection thereof (collectively, the "Artifact"), is hereby
designated a **Proprietary Intellectual Artifact of V-Channel, Inc.**

The Artifact was designed, composed, integrated, and delivered under the
**DaScient Full-Stack Development Framework**, an engineering methodology and
toolchain authored by **DaScient, Inc.** Unless a separate written agreement
states otherwise, the Protocol design and this documentation are owned by
V-Channel, Inc., and the DaScient Full-Stack Development Framework remains the
intellectual property of DaScient, Inc.

## 2. Copyright

> Copyright © 2026 V-Channel, Inc. All rights reserved.
>
> Portions of the engineering framework, methodology, and tooling:
> Copyright © 2026 DaScient, Inc. All rights reserved.

No part of the Artifact may be reproduced, distributed, transmitted, displayed,
published, sublicensed, or used to create derivative works — in whole or in
part — by any means, except as expressly permitted in writing by V-Channel, Inc.
or as set out in Section 4 (Third-Party Components).

## 3. Trademarks

"V-Channel" and the V-Channel logo are trademarks of V-Channel, Inc.
"DaScient" and the DaScient Full-Stack Development Framework name are trademarks
of DaScient, Inc. All other product, service, and company names referenced in
this package — including Medusa, Stripe, SendGrid, Amazon S3, PostHog, Google,
GitHub, Next.js, and Vercel — are the trademarks or registered trademarks of
their respective owners and are used for identification purposes only. Their use
does not imply endorsement.

## 4. Third-party components and license posture

The Protocol is implemented on top of, and integrates with, independently
licensed third-party software. **This proprietary designation applies to the
V-Channel-authored Protocol design, configuration, custom modules, workflows,
interface contracts, and documentation — not to the upstream open-source
projects**, which remain governed by their own licenses.

| Component | Role | Governed by |
| --- | --- | --- |
| Medusa (`@medusajs/*`) | Commerce framework / runtime | Its own open-source license (MIT) |
| Stripe SDK (`stripe`) | Billing & payments | Stripe's license & terms |
| Next.js | Frontend runtime | Its own open-source license |
| Other npm dependencies | See [`../package.json`](../package.json) | Their respective licenses |

The reference application in this repository (`v-channel-backend`) declares an
`MIT` license in [`../package.json`](../package.json) for the **scaffold code**
so it can be lifted into a fresh Medusa app. The **Protocol design,
architecture, and this documentation package** are nonetheless the proprietary
Artifact described in Section 1. Where the two interpretations could appear to
conflict for any V-Channel-internal distribution, this Legal Notice controls for
the documentation and design; the per-file source license controls for the
individual source files it accompanies.

> Operational note: when distributing the Artifact externally, confirm the
> intended license for source files with V-Channel, Inc. legal before release.
> This package does not alter any upstream license and must not be read to do so.

## 5. Permitted internal use

Subject to this Notice, V-Channel, Inc. personnel and its authorized contractors
(including DaScient, Inc. acting under engagement) MAY use, reproduce, and modify
the Artifact internally for the purpose of building, operating, and maintaining
the V-Channel platform. This permission is non-transferable and terminates on
the conclusion of the relevant engagement or employment.

## 6. Confidentiality

The Artifact may contain commercially sensitive design decisions, pricing
mechanics, and operational procedures. Recipients MUST treat the Artifact as
confidential and MUST NOT disclose it to third parties without prior written
consent from V-Channel, Inc.

## 7. No warranty

THE ARTIFACT IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. IN NO EVENT SHALL V-CHANNEL,
INC. OR DASCIENT, INC. BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY
ARISING FROM, OUT OF, OR IN CONNECTION WITH THE ARTIFACT OR ITS USE.

## 8. Security and secrets

This documentation package contains **no** live credentials, secrets, or API
keys. All example values are placeholders (see [`../.env.template`](../.env.template)).
Handling of real secrets is governed by [`10-security-compliance.md`](./10-security-compliance.md).

## 9. Contact

For licensing, distribution, or clarification of this Notice, contact V-Channel,
Inc. through its official channels. For questions about the DaScient Full-Stack
Development Framework, contact DaScient, Inc.

---

*V-Channel, Inc. Proprietary Intellectual Artifact — prepared under the DaScient
Full-Stack Development Framework by DaScient, Inc. — June 23, 2026. All rights
reserved.*

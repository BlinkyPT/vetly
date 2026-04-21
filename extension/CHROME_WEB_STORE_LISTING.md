# Chrome Web Store listing — Vetly

## Name
Vetly — Trust signals for Google Search

## Short summary (132 chars max)
A green/amber/red trust badge on every Google result. Spot AI-written spam, SEO farms, and real journalism in a glance.

## Detailed description

The web in 2026 is full of AI-generated spam, SEO farms, and rewrites of real journalism. Google's results page gives you no signal about which pages are trustworthy beyond the domain name — which is easy to game.

Vetly fixes that. It injects a small trust badge next to every Google search result, coloured by our assessment of the publisher:
• **Green** — known high-trust source (major newspapers, peer-reviewed journals, government, universities)
• **Amber** — mixed or user-generated (blogs, aggregators, opinion sections)
• **Red** — known low-trust source (content farms, known misinformation sites)
• **Grey** — unknown; Vetly is running a live check

Click any badge to open the **methodology panel** — every signal that went into the score, with its weight and the raw evidence. No black boxes.

### Deep assessment
For supported content pages, Vetly can go further: it runs a structured read on the page itself — AI-generated-content probability, citation density, byline presence, freshness, ad-to-content ratio, editorial bias markers — and gives you a per-page score.

### Free for everyone, donation-supported
Vetly is **free**. There is no paid tier, no feature is gated behind payment, and there are no ads. We believe a trust signal on search results is a public good. The LLM calls that power deep assessments cost real money, so we rely on donations — one-off or monthly, whatever you can chip in. If you never give a penny, Vetly still works exactly the same for you.

There is a daily cap on deep assessments (50 per device) — that exists purely to prevent a single bad actor from draining our budget.

### Signal, not gate
Vetly never hides or removes results. You stay in control. We just annotate.

### Privacy
Vetly reads the list of URLs on the SERP so it can render the badge. When you open a deep assessment, the main article text is sent to our server (not the full page, not your cookies, not your history). We never sell your data.

### BYOK mode — stronger privacy
If you prefer, paste your own Anthropic API key in the extension settings. Vetly will call Claude directly from your browser — **page content never touches our server**. You pay Anthropic directly, nothing to us. Perfect for journalists, lawyers, and anyone whose queries are sensitive.

Full privacy policy at https://vetly.app/privacy.

## Category
Productivity

## Language
English

## Screenshots (1280×800)
1. A Google SERP with green/amber/red badges next to each result.
2. The methodology panel open, showing every signal with its weight.
3. The deep-assessment panel with the AI-probability bar, citation count, byline, and freshness.
4. The dashboard on vetly.app with the user's feedback history.
5. The "Support Vetly" page showing donation options (one-off or monthly).

## Single purpose
Vetly has one purpose: annotate Google search results and supported content pages with a source-trust badge and explainable methodology.

## Permissions justification
- **storage** — remembers the user's device ID for anti-abuse rate limiting + their settings (allow/deny list, show-on-SERP toggle).
- **activeTab** — lets the popup trigger a deep assessment of the currently open tab when the user clicks the action button.
- **host_permissions: https://*/*** — needed so the clickthrough content script can extract article text on any content site for the deep assessment feature. Nothing is sent until the user triggers the assessment.

## Privacy policy URL
https://vetly.app/privacy

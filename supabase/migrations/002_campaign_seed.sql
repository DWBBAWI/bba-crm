-- Campaign seed data with full email/SMS copy

-- CAMPAIGN 1: Cold Prospect Sequence
insert into public.campaigns (id, name, type, description) values
  ('c1000000-0000-0000-0000-000000000001', 'Cold Prospect Sequence', 'cold_prospect',
   '7-touch email and SMS sequence over 21 days for cold prospects');

insert into public.campaign_steps (campaign_id, step_number, type, delay_days, subject, body) values
('c1000000-0000-0000-0000-000000000001', 1, 'email', 0,
 'Quick question about your payment processing',
 'Hi [FirstName],

I''ll keep this short — I help business owners like you reduce what you''re paying in credit card processing fees, often saving $300–$1,200 per month depending on your volume.

My name is [RepName] with Breakthrough Business Advisors. We specialize in transparent, low-cost merchant services for businesses in your industry. No hidden fees, no long-term contracts, and next-day funding so your cash flow stays healthy.

One quick question: do you know what effective rate you''re currently paying on your processing?

If you''d like, I can do a free 5-minute analysis of your current statement and show you exactly what you could be saving. No pressure, no obligation.

Worth a quick chat?

Best,
[RepName]
Breakthrough Business Advisors'),

('c1000000-0000-0000-0000-000000000001', 2, 'sms', 1,
 null,
 'Hi [FirstName], this is [RepName] from Breakthrough Business Advisors. I sent you an email yesterday about saving money on your processing fees. Most of our clients save $400–$1,000/month. Worth a 5-minute chat? Reply here or call me anytime.'),

('c1000000-0000-0000-0000-000000000001', 3, 'email', 4,
 'Are processing fees eating into your margins?',
 'Hi [FirstName],

I wanted to follow up on my last email. Here''s something that might resonate:

The average small business owner pays 2.5–3.5% in processing fees — sometimes more. On $50,000 in monthly volume, that''s $1,250–$1,750 every single month going straight to your processor.

Most business owners we talk to have no idea what they''re actually paying. They see a deposit in their account and assume everything is fine — but the fees buried in the statement tell a different story.

We''ve helped hundreds of merchants across the country cut their effective rate significantly. In some cases, we even offer a cash discount program that passes processing fees to customers who pay with cards, so you pay nothing.

Would it be worth 10 minutes to see what you''re actually paying versus what you could be paying?

I''m happy to do a free, no-obligation rate analysis. Just send me your most recent processing statement and I''ll turn it around within 24 hours.

[RepName]
Breakthrough Business Advisors'),

('c1000000-0000-0000-0000-000000000001', 4, 'email', 7,
 'How [BusinessName] could process like the big guys',
 'Hi [FirstName],

Quick story: Last year we started working with a restaurant owner who was processing about $80,000 a month. She was paying her processor 2.8% — which felt "normal" to her since she''d been with them for years.

After our analysis, we moved her to a flat interchange-plus structure. Her effective rate dropped to 1.6%. That''s $960 a month back in her pocket — every single month.

She used the savings to hire a part-time employee.

I''m sharing this because I think [BusinessName] could have a similar result. Processing is one of those costs that feels fixed — but it doesn''t have to be.

Can we get 10 minutes on the calendar? I''ll do the analysis for free, show you exactly where your money is going, and let the numbers speak for themselves.

No pitch, no pressure. Just clarity on what you''re actually paying.

[RepName]
Breakthrough Business Advisors'),

('c1000000-0000-0000-0000-000000000001', 5, 'sms', 8,
 null,
 'Hey [FirstName], [RepName] here. Just checking in — did you get a chance to look at my emails about your processing fees? Happy to do a quick free analysis. No strings attached. What does your schedule look like this week?'),

('c1000000-0000-0000-0000-000000000001', 6, 'email', 14,
 'Next-day funding, no contracts — here''s what that means for you',
 'Hi [FirstName],

I haven''t heard back yet, so I wanted to share one more thing that sets us apart from the big processors.

Two things most processors don''t offer:

1. NEXT-DAY FUNDING — With most banks and processors, your money sits for 2–3 days before it hits your account. With us, you get funded the next business day. For a busy operation like [BusinessName], that''s real cash flow.

2. NO LONG-TERM CONTRACTS — We don''t lock you in. If you''re not saving money or not happy with our service, you can leave. We keep clients by being better, not by trapping them.

We also offer free equipment placement — no upfront cost for the terminal or POS system.

Still not sure? I get it. You''re busy and your inbox is full. But this is the kind of decision that compounds over time. Every month you overpay is money you don''t get back.

Let''s set up 10 minutes. I''ll do the analysis, show you the numbers, and you decide. Fair enough?

[RepName]
Breakthrough Business Advisors'),

('c1000000-0000-0000-0000-000000000001', 7, 'email', 21,
 'Closing the loop on [BusinessName]',
 'Hi [FirstName],

I''ve reached out a few times about potentially saving [BusinessName] money on processing fees, and I haven''t heard back.

I completely understand — you''re running a business and your time is limited. I won''t keep filling your inbox.

This is my last email on this topic. If you ever want to revisit the conversation — whether that''s next month or next year — my door is always open.

For what it''s worth, our average client saves over $500/month, gets next-day funding, and has no long-term contract. If that ever becomes relevant, you know where to find me.

Wishing you and [BusinessName] continued success.

[RepName]
Breakthrough Business Advisors

P.S. — If the timing ever is right, just reply to this email and we''ll pick it up from here.');

-- CAMPAIGN 2: Warm Prospect — Shift4 Dine
insert into public.campaigns (id, name, type, description) values
  ('c2000000-0000-0000-0000-000000000001', 'Warm Prospect — Shift4 Dine', 'warm_shift4',
   '5-email, 2-SMS follow-up sequence for prospects interested in Shift4 Dine');

insert into public.campaign_steps (campaign_id, step_number, type, delay_days, subject, body) values
('c2000000-0000-0000-0000-000000000001', 1, 'email', 0,
 'Following up on Shift4 Dine for [BusinessName]',
 'Hi [FirstName],

It was great connecting with you about Shift4 Dine. I wanted to follow up with a few things I think you''ll find useful.

Shift4 Dine is purpose-built for restaurants like [BusinessName]. Here''s what makes it different from a basic POS:

• Table management with real-time floor plan view
• Online ordering integration (no third-party fees)
• Kitchen display system built in
• Detailed reporting by item, server, and shift
• Loyalty program built in

And because we install and support the system directly, you''re not left calling an 800 number when something goes wrong at dinner rush.

I''d love to put together a proposal customized for [BusinessName]. Can we get 20 minutes on the calendar this week?

[RepName]
Breakthrough Business Advisors'),

('c2000000-0000-0000-0000-000000000001', 2, 'sms', 2,
 null,
 'Hi [FirstName], [RepName] here from Breakthrough. Just wanted to make sure you got my email about Shift4 Dine. It''s a great fit for what you described. Want to jump on a quick call this week?'),

('c2000000-0000-0000-0000-000000000001', 3, 'email', 4,
 'What Shift4 Dine costs — and what it saves',
 'Hi [FirstName],

I want to give you real numbers on Shift4 Dine so you can make a confident decision.

The average restaurant using Shift4 sees:
• 8–12% reduction in ticket errors (fewer comps, fewer refunds)
• 15–20% faster table turns with digital order routing
• $0 upfront hardware cost when you process with us

The system pays for itself quickly when you factor in reduced errors and processing savings.

And here''s the thing most reps won''t tell you: the processing rate you get bundled with your POS system is often the biggest hidden cost. We make sure you''re on a transparent, competitive rate — not a padded bundle rate.

Can I put together a side-by-side comparison of your current setup vs. Shift4 Dine? It takes me about 30 minutes and costs you nothing.

[RepName]
Breakthrough Business Advisors'),

('c2000000-0000-0000-0000-000000000001', 4, 'email', 7,
 'Quick question about your current POS',
 'Hi [FirstName],

One question: what''s the #1 frustration you have with your current setup?

Whether it''s slow service, clunky reporting, hardware breaking down, or support that never calls back — that''s exactly the kind of problem Shift4 Dine is designed to solve.

I ask because I want to make sure if we do a demo, I''m showing you the features that actually matter to [BusinessName] — not just a generic pitch.

Hit reply and let me know. Even one sentence helps.

[RepName]
Breakthrough Business Advisors'),

('c2000000-0000-0000-0000-000000000001', 5, 'sms', 8,
 null,
 '[FirstName], [RepName] again. I know you''re busy — just want to make sure Shift4 Dine stays on your radar. Tons of restaurants are switching before summer. Happy to do a 15-min walkthrough anytime. Just say the word.'),

('c2000000-0000-0000-0000-000000000001', 6, 'email', 10,
 'Last thing I''ll share about Shift4 Dine',
 'Hi [FirstName],

I''ll keep this brief. I know I''ve sent a few emails about Shift4 Dine.

Here''s the bottom line for [BusinessName]:

✓ Restaurant-grade POS built for speed and accuracy
✓ Zero upfront hardware cost
✓ Competitive processing rate (we''ll show you the math)
✓ Local support — not an 800 number
✓ No long-term contract required

If you want to explore it, just reply and we''ll set up a no-pressure demo at your convenience. If the timing isn''t right, I understand completely.

Either way, I''m here whenever you''re ready.

[RepName]
Breakthrough Business Advisors');

-- CAMPAIGN 3: New Client Onboarding
insert into public.campaigns (id, name, type, description) values
  ('c3000000-0000-0000-0000-000000000001', 'New Client Onboarding', 'onboarding',
   '4-email welcome and onboarding sequence over 30 days');

insert into public.campaign_steps (campaign_id, step_number, type, delay_days, subject, body) values
('c3000000-0000-0000-0000-000000000001', 1, 'email', 0,
 'Welcome to Breakthrough Business Advisors, [FirstName]!',
 'Hi [FirstName],

Welcome to the Breakthrough family! We''re genuinely excited to have [BusinessName] on board.

Here''s what happens next:

1. EQUIPMENT — Your [SystemName] is being configured for your business. Your installation is scheduled and you''ll receive a confirmation separately.

2. YOUR FIRST DEPOSIT — Expect your first next-day deposit within 1–2 business days after your first transaction. You''ll see it labeled from Breakthrough Business Advisors.

3. SUPPORT — You can reach me directly at any time. I''m your point of contact, not a call center. My cell is always on.

4. STATEMENTS — You''ll receive a monthly statement showing your processing volume, fees, and effective rate. No surprises.

If you have any questions before your install, just reply to this email or shoot me a text. I''m here.

Again — thank you for trusting us with your business. We''re going to take great care of you.

[RepName]
Breakthrough Business Advisors'),

('c3000000-0000-0000-0000-000000000001', 2, 'email', 3,
 'Quick tips for getting the most out of your [SystemName]',
 'Hi [FirstName],

Now that your [SystemName] is set up (or almost set up), here are a few tips from businesses who''ve gotten the most out of their system:

TRAINING YOUR STAFF
• Run a few test transactions before going live
• Have each employee do one transaction with you present on day one
• The [SystemName] has a training mode — ask me to walk you through it

DAILY CLOSE
• Always run your batch close at the same time each day (we recommend after closing)
• This triggers your next-day deposit — don''t skip it

REPORTING
• Check your weekly summary report every Monday — it takes 2 minutes and tells you everything
• If you ever see a transaction you don''t recognize, reach out to me immediately

Any questions at all — I''m one text away. How''s everything going so far?

[RepName]
Breakthrough Business Advisors'),

('c3000000-0000-0000-0000-000000000001', 3, 'email', 7,
 'One week in — how is [BusinessName] doing?',
 'Hi [FirstName],

It''s been about a week since you got set up with us. Just checking in — how''s everything going?

A few things I want to confirm:
• Are your deposits arriving next day as expected?
• Is the equipment working properly?
• Do you or your staff have any questions about the system?

If anything feels off — even something small — please let me know. It''s much easier to address things early.

Also, a friendly reminder: if you ever need paper rolls, cleaning cards, or any supplies for your terminal, just let me know. We take care of it.

Looking forward to a long relationship with [BusinessName].

[RepName]
Breakthrough Business Advisors'),

('c3000000-0000-0000-0000-000000000001', 4, 'email', 30,
 '30-day check-in + a favor to ask',
 'Hi [FirstName],

It''s been 30 days since [BusinessName] joined Breakthrough Business Advisors — and I just wanted to say thank you again for giving us a shot.

By now you should be:
✓ Receiving next-day deposits reliably
✓ Comfortable with your [SystemName]
✓ Paying less in processing fees than before

If any of that isn''t true, please tell me right now — I want to fix it.

Now, the favor:

If you''re happy with how things are going, do you know any other business owners who might benefit from lower processing fees and better service?

We pay a referral bonus — up to $500 cash — for every business you send our way that becomes a client. Just an introduction is enough; we take it from there.

Who''s one person in your network who might benefit from what we do?

[RepName]
Breakthrough Business Advisors');

-- CAMPAIGN 4: Renewal / Retention
insert into public.campaigns (id, name, type, description) values
  ('c4000000-0000-0000-0000-000000000001', 'Renewal & Retention', 'renewal',
   '5-email sequence triggered 90 days before contract expiration');

insert into public.campaign_steps (campaign_id, step_number, type, delay_days, subject, body) values
('c4000000-0000-0000-0000-000000000001', 1, 'email', 0,
 'Heads up: your renewal is coming up at [BusinessName]',
 'Hi [FirstName],

I wanted to reach out personally to give you a heads-up: your processing agreement with us is coming up for renewal in the next 90 days.

I know that might feel like plenty of time, but I''d love to connect before then to make sure everything is working well for [BusinessName] — and to talk about what''s new on our end that might be a good fit for you.

A few things worth knowing:
• We have updated rate structures that may save you even more
• New POS features and integrations are available
• We''re expanding our referral program

There''s nothing you need to do right now. I''ll follow up in a few weeks to schedule a quick call. But if you want to get ahead of it, just reply here.

Talk soon.

[RepName]
Breakthrough Business Advisors'),

('c4000000-0000-0000-0000-000000000001', 2, 'email', 15,
 'Here''s what we''ve done for [BusinessName] this year',
 'Hi [FirstName],

With your renewal coming up, I thought it would be a good time to recap what we''ve accomplished together:

YOUR NUMBERS (approximate, based on your volume):
• Total volume processed: [Volume]
• Estimated savings vs. your previous processor: significant
• Average deposit time: next business day
• Equipment uptime: 99%+
• Support tickets resolved: same day

We''re proud of what we''ve been able to do for [BusinessName], and we want to keep earning your business.

Can we get 15 minutes on the calendar in the next two weeks to talk about your renewal options?

[RepName]
Breakthrough Business Advisors'),

('c4000000-0000-0000-0000-000000000001', 3, 'email', 30,
 'New options available for [BusinessName]',
 'Hi [FirstName],

I wanted to share a few updates that might be relevant as you think about your renewal:

WHAT''S NEW:
• Enhanced reporting dashboard — real-time sales analytics, labor cost integration
• Upgraded hardware options — faster, sleeker terminals
• Expanded integrations — QuickBooks, Toast, and more
• Loyalty program add-on — proven to increase repeat visits by 15–25%

Any of these could be layered onto your current setup with minimal disruption to [BusinessName].

I''d love to walk you through what makes sense for your situation. Would a 20-minute call this week work?

[RepName]
Breakthrough Business Advisors'),

('c4000000-0000-0000-0000-000000000001', 4, 'email', 45,
 'Special renewal offer for [BusinessName]',
 'Hi [FirstName],

As your renewal approaches, I want to offer something as a thank-you for being a valued client:

FOR YOUR RENEWAL:
• Locked-in rate for 12 months (protection from rate increases)
• Free equipment upgrade if your hardware is over 2 years old
• Waived any applicable renewal fee
• Priority support line — direct to our team, no wait

This offer is available for clients who confirm their renewal in the next 30 days. I want to make sure you have the opportunity to take advantage of it.

Can we get a quick call on the books? I can walk you through everything in about 15 minutes.

[RepName]
Breakthrough Business Advisors'),

('c4000000-0000-0000-0000-000000000001', 5, 'email', 60,
 'Final notice: [BusinessName] renewal',
 'Hi [FirstName],

Your processing agreement is coming up for renewal very soon. I want to make sure this doesn''t slip through the cracks — for both of us.

Renewing is simple. It takes about 5 minutes and ensures there''s no disruption to your processing or deposits.

If you''d like to explore alternatives before renewing, I''m also happy to do a fresh rate analysis. I want to make sure we''re still the best option for [BusinessName] — and if there''s ever a way to do better, I''ll tell you.

Please reply to this email or call me directly this week. I don''t want you to experience any lapse in service.

[RepName]
Breakthrough Business Advisors');

-- CAMPAIGN 5: Re-engagement
insert into public.campaigns (id, name, type, description) values
  ('c5000000-0000-0000-0000-000000000001', 'Re-Engagement Sequence', 'reengagement',
   '4-email re-engagement campaign for cold leads over 14 days');

insert into public.campaign_steps (campaign_id, step_number, type, delay_days, subject, body) values
('c5000000-0000-0000-0000-000000000001', 1, 'email', 0,
 'It''s been a while, [FirstName]',
 'Hi [FirstName],

It''s [RepName] from Breakthrough Business Advisors. We connected a while back about potentially reducing [BusinessName]''s processing fees, but the timing didn''t work out.

I''m reaching out because things have changed a bit on our end — we have new options that might be an even better fit now than they were before.

I won''t rehash everything. Just wanted to check in and see where things stand for you today.

Are you still exploring options, or did you find a solution that''s working?

Either way, happy to catch up.

[RepName]
Breakthrough Business Advisors'),

('c5000000-0000-0000-0000-000000000001', 2, 'email', 5,
 'Something new that might change your mind',
 'Hi [FirstName],

Quick follow-up. I know you''re busy, so I''ll be brief.

Since we last talked, we''ve added a couple of things I think are worth mentioning:

• ZERO-FEE PROCESSING — We now offer a compliant cash discount program that eliminates your processing fees entirely. Customers who pay with a card cover a small service fee; cash customers pay the listed price. It''s 100% legal and many of our clients are saving $800–$1,500/month.

• SAME-DAY FUNDING — For qualifying businesses, we can now offer same-day deposits.

Would either of these be worth a 10-minute conversation?

[RepName]
Breakthrough Business Advisors'),

('c5000000-0000-0000-0000-000000000001', 3, 'email', 10,
 'One last try, [FirstName]',
 'Hi [FirstName],

I''ve sent a couple of emails and I don''t want to be a nuisance. So this is my last check-in for a while.

If the timing is just off, I completely understand. Running [BusinessName] is your priority.

But if there''s any part of your processing situation that''s still nagging at you — fees too high, equipment problems, bad support, slow deposits — I''d genuinely love to help.

One email is all it takes to get the conversation started.

[RepName]
Breakthrough Business Advisors'),

('c5000000-0000-0000-0000-000000000001', 4, 'email', 14,
 'Closing your file at [BusinessName]',
 'Hi [FirstName],

I''m going to stop reaching out after this — I don''t want to keep filling your inbox with emails you''re not interested in.

I''m going to go ahead and close out your file on our end.

If anything ever changes and you want to revisit the conversation — whether that''s about processing fees, a new POS system, or anything else — just reach out. I''ll remember the context and we can pick up where we left off.

Wishing you and [BusinessName] the best.

[RepName]
Breakthrough Business Advisors

P.S. — If this email finally caught you at the right moment, just hit reply. I''m happy to pick the conversation back up immediately.');

-- CAMPAIGN 6: Referral Ask
insert into public.campaigns (id, name, type, description) values
  ('c6000000-0000-0000-0000-000000000001', 'Referral Ask Sequence', 'referral_ask',
   '3-email referral campaign for happy active clients over 7 days');

insert into public.campaign_steps (campaign_id, step_number, type, delay_days, subject, body) values
('c6000000-0000-0000-0000-000000000001', 1, 'email', 0,
 'Love working with you — know anyone who could use our help?',
 'Hi [FirstName],

I just wanted to take a moment to say — it''s genuinely a pleasure working with [BusinessName]. You''ve been a great client and I appreciate the trust you''ve placed in us.

That''s actually why I''m writing today.

We grow almost entirely through referrals. And the best referrals always come from happy clients like you.

Do you know any other business owners — a friend, neighbor, supplier, or fellow business owner — who might benefit from lower processing fees, better equipment, or just better service than they''re getting now?

I''m not asking you to do a sales pitch. Just an introduction is enough. I''ll handle everything from there.

And as a thank-you: we pay up to $500 in cash for every referral that becomes a client.

Just hit reply with a name and contact info, and I''ll take it from there.

Thank you, [FirstName].

[RepName]
Breakthrough Business Advisors'),

('c6000000-0000-0000-0000-000000000001', 2, 'email', 4,
 'A quick reminder about our referral bonus',
 'Hi [FirstName],

Quick follow-up on my last email.

Just a reminder: we pay a $500 cash referral bonus for every business you refer to us that becomes a client. No limits — if you refer 3 businesses and they all sign up, that''s $1,500 in your pocket.

No paperwork, no complicated process. You just introduce us, we do the rest, and you get paid when they sign.

Who''s one person in your network who you think is probably overpaying for processing right now?

Reply with their name and I''ll reach out on your behalf.

[RepName]
Breakthrough Business Advisors'),

('c6000000-0000-0000-0000-000000000001', 3, 'email', 7,
 'Last call: $500 referral bonus + details',
 'Hi [FirstName],

Last email on this topic — I promise.

Here''s everything you need to know about our referral program in one place:

HOW IT WORKS:
1. You give me the name and contact info of a business owner
2. I reach out, do a free analysis, and present our services
3. If they sign up, you get $500 cash — no questions asked
4. No limit on how many referrals you can make

WHO QUALIFIES:
Any business that accepts credit cards and is currently with another processor. Restaurants, retail, salons, contractors, medical offices — anyone.

It''s one of the easiest $500 you could ever make.

If you have someone in mind but aren''t sure if they''d be interested — just give me the name. I''ll handle the conversation with care and make sure your relationship with them is protected.

Thank you for being such a great client, [FirstName]. We appreciate [BusinessName] more than you know.

[RepName]
Breakthrough Business Advisors');

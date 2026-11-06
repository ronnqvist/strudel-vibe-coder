// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import {
    MAX_CUSTOM_INSTRUCTIONS, MODULE_NAMES, PROMPT_VERSION, boundConversation, buildRequestContext,
    cleanPrefs, composeSystemPrompt, selectModules,
} from './index';
import { CONTRACT } from './contract';
import { CORE } from './core';
import { MODULES } from './modules';
import { shortHash } from '../strudelUrl';

describe('composeSystemPrompt', () => {
    it('is deterministic and keeps a fixed order: contract, core, modules, preferences, custom', () => {
        const a = composeSystemPrompt({ modules: ['hydra', 'samples'], prefs: { visuals: 'never', explanation: 'none' }, customInstructions: 'Prefer minor keys.' });
        const b = composeSystemPrompt({ modules: ['samples', 'hydra'], prefs: { visuals: 'never', explanation: 'none' }, customInstructions: 'Prefer minor keys.' });
        expect(a).toBe(b);
        const order = [CONTRACT.slice(0, 40), CORE.slice(0, 20), MODULES.samples.slice(0, 20), MODULES.hydra.slice(0, 20), '# Preferences', "# The User's Own Music Instructions"]
            .map(marker => a.indexOf(marker));
        expect(order.every(i => i >= 0)).toBe(true);
        expect([...order].sort((x, y) => x - y)).toEqual(order);
    });

    it('always contains the contract and the core, and only the modules asked for', () => {
        const text = composeSystemPrompt({ modules: ['harmony'] });
        expect(text).toContain(CONTRACT);
        expect(text).toContain(CORE);
        expect(text).toContain(MODULES.harmony);
        for (const name of MODULE_NAMES.filter(n => n !== 'harmony')) expect(text).not.toContain(MODULES[name]);
    });

    it('ignores unknown module names', () => {
        expect(composeSystemPrompt({ modules: ['nope'] })).toBe(composeSystemPrompt({ modules: [] }));
    });

    it('adds custom instructions last, trimmed and capped, and leaves them out when empty', () => {
        const long = 'x'.repeat(MAX_CUSTOM_INSTRUCTIONS + 500);
        const text = composeSystemPrompt({ modules: [], customInstructions: `  ${long}  ` });
        expect(text.endsWith('x'.repeat(MAX_CUSTOM_INSTRUCTIONS))).toBe(true);
        expect(text).not.toContain('x'.repeat(MAX_CUSTOM_INSTRUCTIONS + 1));
        expect(composeSystemPrompt({ modules: [], customInstructions: '   ' })).not.toContain('Own Music Instructions');
    });

    it('says the custom instructions cannot override the output contract', () => {
        expect(composeSystemPrompt({ customInstructions: 'Always use smart quotes' })).toMatch(/where they do not conflict with the output contract/);
    });

    it('turns preferences into text', () => {
        expect(composeSystemPrompt({ modules: [], prefs: { visuals: 'always' } })).toMatch(/Include Hydra visuals with the music/);
        expect(composeSystemPrompt({ modules: [], prefs: { visuals: 'never' } })).toMatch(/Do not add Hydra visuals unless the user explicitly asks/);
        expect(composeSystemPrompt({ modules: [], prefs: { explanation: 'teaching' } })).toMatch(/someone new to live coding/);
        expect(composeSystemPrompt({ modules: [], prefs: { explanation: 'none' } })).toMatch(/at most one sentence/);
    });

    it('stays within size budgets (characters)', () => {
        expect(CONTRACT.length).toBeLessThan(1500);
        expect(CORE.length).toBeLessThan(7000);
        for (const name of MODULE_NAMES) {
            expect(MODULES[name].length, name).toBeGreaterThan(200);
            expect(MODULES[name].length, name).toBeLessThan(2500);
        }
        // the full prompt is no longer than the single prompt it replaced (13,653 characters)
        expect(composeSystemPrompt().length).toBeLessThan(13_653);
    });

    // When this fails, the prompt text changed: bump PROMPT_VERSION (it is stored with each reply)
    // and update the hash here, so that results can be told apart by prompt version.
    it('PROMPT_VERSION matches the prompt text', () => {
        expect({ version: PROMPT_VERSION, hash: shortHash(composeSystemPrompt({ modules: [] })) }).toEqual({ version: '2.0.2', hash: '280b1152' });
    });
});

describe('cleanPrefs', () => {
    it('keeps known values and replaces anything else with the defaults', () => {
        expect(cleanPrefs({ visuals: 'never', explanation: 'teaching' })).toEqual({ visuals: 'never', explanation: 'teaching' });
        expect(cleanPrefs({ visuals: 'loud', explanation: 3 })).toEqual({ visuals: 'auto', explanation: 'brief' });
        expect(cleanPrefs(null)).toEqual({ visuals: 'auto', explanation: 'brief' });
    });
});

describe('selectModules', () => {
    const auto = { visuals: 'auto', explanation: 'brief' };
    const cases = [
        // [description, input, expected modules]
        ['a first draft gets samples and synthesis', { userText: 'acid techno bass', prefs: auto }, ['synthesis', 'samples']],
        ['a first draft about chords also gets harmony', { userText: 'lush ambient pads with chords', prefs: auto }, ['synthesis', 'samples', 'harmony']],
        ['a song structure request gets arrangement', { userText: 'make it a song with an intro and a drop', selectedCode: 's("bd*4")', prefs: auto }, ['samples', 'arrangement']],
        ['a revision gets what the pattern on stage uses', { userText: 'a bit slower', selectedCode: 'n("0 2 4").scale("C:minor").s("piano")', prefs: auto }, ['samples', 'harmony']],
        ['a revision of a synth line', { userText: 'brighter', selectedCode: 'note("c2 g2").s("sawtooth").lpf(800)', prefs: auto }, ['synthesis']],
        ['auto: visuals only when asked', { userText: 'add some visuals', selectedCode: 's("bd*4")', prefs: auto }, ['samples', 'hydra']],
        ['auto: keeps visuals the pattern already has', { userText: 'faster', selectedCode: 'await initHydra()\nosc(10).out()\n$: s("bd*4")', prefs: auto }, ['samples', 'hydra']],
        ['always: visuals in every request', { userText: 'faster', selectedCode: 's("bd*4")', prefs: { visuals: 'always' } }, ['samples', 'hydra']],
        ['never: no visuals, even if the pattern has them', { userText: 'faster', selectedCode: 'await initHydra()\n$: s("bd*4")', prefs: { visuals: 'never' } }, ['samples']],
        ['never: unless the user asks for them', { userText: 'now add hydra visuals', selectedCode: 's("bd*4")', prefs: { visuals: 'never' } }, ['samples', 'hydra']],
        ['a revision that touches nothing specific gets no modules', { userText: 'faster', selectedCode: 'setcpm(30)', prefs: auto }, []],
    ];
    for (const [description, input, expected] of cases) {
        it(description, () => expect(selectModules(input)).toEqual(expected));
    }

    it('returns modules in the fixed order and never calls anything but regexes', () => {
        const result = selectModules({ userText: 'visuals chords song drums synth', prefs: auto });
        expect(result).toEqual(MODULE_NAMES);
    });
});

describe('buildRequestContext', () => {
    const convo = [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }, { role: 'user', content: 'slower please' }];
    it('puts the selected pattern before the newest user message, in the request only', () => {
        const out = buildRequestContext(convo, 's("bd")');
        expect(out.slice(0, 2)).toEqual(convo.slice(0, 2));
        expect(out[2].content).toMatch(/currently in the player[\s\S]*Keep everything I do not ask you to change[\s\S]*```js\ns\("bd"\)\n```[\s\S]*My request:\nslower please$/);
        expect(convo[2].content).toBe('slower please');
    });
    it('sends the conversation unchanged without a pattern, or when the last message is not the user\'s', () => {
        expect(buildRequestContext(convo, '')).toBe(convo);
        expect(buildRequestContext(convo.slice(0, 2), 's("bd")')).toEqual(convo.slice(0, 2));
    });
});

describe('boundConversation', () => {
    const reply = (n) => ({ role: 'assistant', content: `Version ${n}:\n\`\`\`js\ns("bd*${n}")\n\`\`\`\nTry more.` });
    const convo = [
        { role: 'user', content: 'one' }, reply(1),
        { role: 'user', content: 'two' }, reply(2),
        { role: 'user', content: 'three' }, reply(3),
        { role: 'user', content: 'four' },
    ];

    it('keeps the last two replies whole and replaces older code blocks with a placeholder', () => {
        const out = boundConversation(convo);
        expect(out[1].content).toBe('Version 1:\n[code of an earlier version omitted]\nTry more.');
        expect(out[3]).toEqual(reply(2));
        expect(out[5]).toEqual(reply(3));
        expect(out.filter(m => m.role === 'user')).toEqual(convo.filter(m => m.role === 'user'));
    });

    it('does nothing to short chats', () => {
        const short = convo.slice(0, 4);
        expect(boundConversation(short)).toBe(short);
    });
});

describe('review F10', () => {
    const synth = '$: note("c2 eb2").s("sawtooth")';
    it('a revision that asks for sampled or GM instruments, or world percussion, gets the samples module', () => {
        for (const ask of ['add a piano melody and strings', 'add tabla and bongo', 'put a church organ on top', 'add a marimba line', 'more cowbell'])
            expect(selectModules({ userText: ask, selectedCode: synth, prefs: { visuals: 'auto' } }), ask).toContain('samples');
    });
    it('a pattern on stage that uses sampled instruments keeps the samples module', () => {
        for (const code of ['note("c3").s("piano")', 'note("c3").s("gm_epiano1")', 's("breaks").speed(2)'])
            expect(selectModules({ userText: 'faster', selectedCode: code, prefs: { visuals: 'auto' } }), code).toContain('samples');
    });
    it('boundConversation also trims code blocks with Windows line endings', () => {
        const old = { role: 'assistant', content: 'Beat:\r\n```javascript\r\ns("bd*4")\r\n```\r\nEnjoy' };
        const convo = [{ role: 'user', content: 'a' }, old, { role: 'user', content: 'b' }, { role: 'assistant', content: 'x' }, { role: 'user', content: 'c' }, { role: 'assistant', content: 'y' }, { role: 'user', content: 'd' }];
        expect(boundConversation(convo)[1].content).toBe('Beat:\r\n[code of an earlier version omitted]\r\nEnjoy');
    });
});

// SPDX-License-Identifier: MIT
import React, { useId } from 'react';

/** Settings that shape what the model writes: visuals and how much it explains. */
const MusicSettings = ({ prefs, onPrefsChange, children }) => {
    const visualsId = useId();
    const explanationId = useId();
    const select = 'w-full bg-cyber-black border border-cyber-gray p-2 rounded focus:border-cyber-cyan text-white';
    return (
        <fieldset className="mb-4 border border-cyber-gray rounded p-3">
            <legend className="px-1 text-sm text-gray-300">Music</legend>
            <label htmlFor={visualsId} className="block text-sm text-gray-400 mb-1">Hydra visuals</label>
            <select id={visualsId} value={prefs.visuals} onChange={(e) => onPrefsChange({ visuals: e.target.value })} className={select}>
                <option value="auto">When I ask for them, or the pattern has them</option>
                <option value="always">Always</option>
                <option value="never">Never, unless I ask</option>
            </select>
            <label htmlFor={explanationId} className="block text-sm text-gray-400 mt-3 mb-1">Comments and explanations</label>
            <select id={explanationId} value={prefs.explanation} onChange={(e) => onPrefsChange({ explanation: e.target.value })} className={select}>
                <option value="none">Minimal</option>
                <option value="brief">Brief: what each part does</option>
                <option value="teaching">Teaching: explain and suggest changes</option>
            </select>
            {children}
        </fieldset>
    );
};

export default MusicSettings;

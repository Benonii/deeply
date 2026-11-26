import { useState } from 'react';

import type { AgentKeyView } from '../../convex/lib/types';

interface NewAgentKeyProps {
  secret: string;
  mcpURL: string;
  keyName: AgentKeyView['name'];
}

export function NewAgentKey({ secret, mcpURL, keyName }: NewAgentKeyProps) {
  const [copied, setCopied] = useState<'secret' | 'command' | null>(null);
  const command = `claude mcp add --transport http deeply ${mcpURL} --header "Authorization: Bearer ${secret}"`;

  const copy = (label: 'secret' | 'command', text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => setCopied(label),
      () => setCopied(null)
    );
  };

  return (
    <div className="acc-notice acc-keys-new">
      <p className="acc-keys-new-head">
        Copy <strong>{keyName}</strong> now. It is never shown again.
      </p>
      <div className="acc-keys-reveal">
        <code className="acc-url" data-testid="agent-key-secret">
          {secret}
        </code>
        <button className="acc-secondary" type="button" onClick={() => copy('secret', secret)}>
          {copied === 'secret' ? 'Copied' : 'Copy key'}
        </button>
      </div>
      <p className="acc-label">Add it to Claude Code</p>
      <div className="acc-keys-reveal">
        <code className="acc-url" data-testid="agent-key-command">
          {command}
        </code>
        <button className="acc-secondary" type="button" onClick={() => copy('command', command)}>
          {copied === 'command' ? 'Copied' : 'Copy command'}
        </button>
      </div>
      <p className="acc-fine">
        In the Claude desktop app, add a connector with the same URL and the same Authorization header.{' '}
        <a href="/api/skill" download="deeply-skill.zip">
          Get the Claude skill
        </a>
        , unzip it into <code>.claude/skills/</code> or upload it as a skill, then ask for a course on any topic.
      </p>
    </div>
  );
}

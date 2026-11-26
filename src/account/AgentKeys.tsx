import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';

import { NewAgentKey } from './NewAgentKey';

import type { AgentKeyView, CreateAgentKeyResult } from '../../convex/lib/types';

const api = anyApi;

interface KeyList {
  mcpURL: string;
  keys: AgentKeyView[];
}

interface CreatedKey {
  secret: string;
  name: string;
}

function formatLastUsed(lastUsedAt: number | null): string {
  return lastUsedAt === null ? 'never' : new Date(lastUsedAt).toLocaleString();
}

export function AgentKeys() {
  const list = useQuery(api.agentKeys.list) as KeyList | undefined;
  const createKey = useMutation(api.agentKeys.create);
  const revokeKey = useMutation(api.agentKeys.revoke);
  const [name, setName] = useState('');
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const submit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      const result = (await createKey({ name })) as CreateAgentKeyResult;
      if (result.status === 'created') {
        setCreated({ secret: result.secret, name: result.key.name });
        setName('');
      } else if (result.status === 'invalid') {
        setError(result.message);
      } else if (result.status === 'rateLimited') {
        setError('That is a lot of keys at once. Try again later.');
      } else {
        setError('Sign in again, then create the key.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
    setIsCreating(false);
  };

  return (
    <section className="acc-section">
      <h2>Claude access</h2>
      <p className="acc-muted">
        Make a key, add the course server to your Claude, then ask Claude to build you a course.
      </p>

      <form className="acc-keys-form" onSubmit={submit}>
        <input
          id="agent-key-name"
          className="acc-keys-input"
          placeholder="Name this key, like Laptop"
          value={name}
          maxLength={60}
          onChange={(changeEvent) => setName(changeEvent.target.value)}
        />
        <button className="acc-primary" type="submit" disabled={isCreating || !name.trim()}>
          {isCreating ? 'Creating…' : 'Create key'}
        </button>
      </form>
      {error && <p className="acc-error">{error}</p>}

      {created && list && <NewAgentKey secret={created.secret} keyName={created.name} mcpURL={list.mcpURL} />}

      {list === undefined && <p className="acc-muted">Loading keys…</p>}
      {list && list.keys.length === 0 && <p className="acc-fine">No keys yet.</p>}
      {list && list.keys.length > 0 && (
        <table className="acc-table acc-keys-table">
          <tbody>
            {list.keys.map((key) => (
              <tr key={key.id}>
                <td>{key.name}</td>
                <td className="acc-keys-prefix">{key.prefix}…</td>
                <td className="acc-when">last used {formatLastUsed(key.lastUsedAt)}</td>
                <td className="acc-keys-revoke">
                  <button type="button" onClick={() => revokeKey({ keyId: key.id })}>
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** The Ask assistant. Reasons over the estate via the pluggable ChatProvider
    (MockChatProvider by default), streams the answer token-by-token, and renders
    inline citations that deep-link into the relevant module. */

import { Badge, Button, Input, makeStyles, tokens } from '@fluentui/react-components';
import { ArrowExportRegular, ChatSparkle20Regular, Send20Filled } from '@fluentui/react-icons';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/AppState';
import { getChatProvider } from '../../services/chat';
import type { ChatMessage, ChatTemplate, ChatTone } from '../../services/chat';
import { PERSONA_BY_ID, PERSONA_PROMPTS } from '../../app/personas';
import { useAgents } from '../../services/hooks';
import type { Citation } from '../../types/domain';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 },
  header: { display: 'flex', alignItems: 'center', gap: '8px', padding: '0 0 10px', fontSize: '12px', color: tokens.colorNeutralForeground3 },
  stream: { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px 2px 12px' },
  msgUser: { alignSelf: 'flex-end', maxWidth: '88%', padding: '9px 13px', borderRadius: '14px 14px 4px 14px', background: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand, fontSize: '13.5px', lineHeight: 1.5 },
  msgBot: { alignSelf: 'flex-start', maxWidth: '94%', display: 'flex', flexDirection: 'column', gap: '8px' },
  botBubble: { padding: '11px 14px', borderRadius: '14px 14px 14px 4px', background: tokens.colorNeutralBackground2, border: `1px solid ${tokens.colorNeutralStroke2}`, fontSize: '13.5px', lineHeight: 1.55 },
  tools: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' },
  toolChip: { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '10.5px' },
  citations: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  empty: { display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start', padding: '8px 2px' },
  emptyTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' },
  emptySub: { fontSize: '12.5px', color: tokens.colorNeutralForeground3, lineHeight: 1.5 },
  chips: { display: 'flex', flexDirection: 'column', gap: '7px', width: '100%', marginTop: '4px' },
  chip: { textAlign: 'left', justifyContent: 'flex-start', fontWeight: 500 },
  dots: { display: 'inline-flex', gap: '3px', alignItems: 'center', height: '14px' },
  dot: { width: '6px', height: '6px', borderRadius: '999px', background: tokens.colorNeutralForeground3 },
  inputRow: { display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '10px', borderTop: `1px solid ${tokens.colorNeutralStroke2}` },
  tplCard: { border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: tokens.borderRadiusLarge, padding: '10px 12px', backgroundColor: tokens.colorNeutralBackground1, display: 'flex', flexDirection: 'column', gap: '8px' },
  tplTitle: { fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: tokens.colorNeutralForeground3 },
  metricStrip: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  metric: { display: 'flex', flexDirection: 'column', gap: '1px', padding: '6px 10px', borderRadius: tokens.borderRadiusMedium, backgroundColor: tokens.colorNeutralBackground2, minWidth: '72px' },
  metricVal: { fontSize: '16px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 },
  metricLbl: { fontSize: '10px', color: tokens.colorNeutralForeground3 },
  tplList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  tplItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 9px', borderRadius: tokens.borderRadiusMedium, backgroundColor: tokens.colorNeutralBackground2 },
  tplItemMain: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' },
  tplItemTitle: { fontSize: '12.5px', fontWeight: 600 },
  tplItemDetail: { fontSize: '11px', color: tokens.colorNeutralForeground3, lineHeight: 1.4 },
});

function toneColor(t?: ChatTone): string | undefined {
  return t === 'good' ? '#107C10' : t === 'bad' ? '#C50F1F' : t === 'warn' ? '#B88217' : undefined;
}

function toneBadge(t?: ChatTone): 'danger' | 'warning' | 'success' | 'informative' {
  return t === 'bad' ? 'danger' : t === 'warn' ? 'warning' : t === 'good' ? 'success' : 'informative';
}

function TemplateCard({ template }: { template: ChatTemplate }) {
  const s = useStyles();
  return (
    <div className={s.tplCard}>
      {template.title && <span className={s.tplTitle}>{template.title}</span>}
      {template.kind === 'metrics' ? (
        <div className={s.metricStrip}>
          {template.metrics.map((m, i) => (
            <div key={i} className={s.metric}>
              <span className={s.metricVal} style={{ color: toneColor(m.tone) }}>
                {m.value}
              </span>
              <span className={s.metricLbl}>{m.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={s.tplList}>
          {template.items.map((it, i) => (
            <div key={i} className={s.tplItem}>
              <span className={s.tplItemMain}>
                <span className={s.tplItemTitle}>{it.title}</span>
                <span className={s.tplItemDetail}>{it.detail}</span>
              </span>
              {it.badge && (
                <Badge appearance="tint" color={toneBadge(it.tone)} size="small">
                  {it.badge}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

function Thinking() {
  const s = useStyles();
  return (
    <span className={s.dots} aria-label="thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={s.dot}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

let counter = 0;
const nextId = () => `m${++counter}`;

export function ChatPanel({ seed, embedded }: { seed?: string | null; embedded?: boolean }) {
  const s = useStyles();
  const navigate = useNavigate();
  const { setAskOpen, persona, ownerId } = useAppState();
  const { data: agents } = useAgents();
  const provider = useMemo(() => getChatProvider(), []);

  const prompts = useMemo(() => {
    if (persona === 'agent-owner') {
      const mine = (agents ?? []).filter((a) => a.owner.id === ownerId);
      const names = [...new Set(mine.map((a) => a.displayName))].slice(0, 2);
      return [
        ...names.map((n) => `How is the ${n} performing?`),
        'Are any of my agents drifting?',
        'Which of my agents are pending approval?',
      ];
    }
    return PERSONA_PROMPTS[persona];
  }, [persona, ownerId, agents]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);

  const scrollDown = () => {
    requestAnimationFrame(() => {
      if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
    });
  };

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setInput('');
    const aId = nextId();
    setMessages((m) => [
      ...m,
      { id: nextId(), role: 'user', content: question },
      { id: aId, role: 'assistant', content: '', streaming: true },
    ]);
    setBusy(true);
    scrollDown();
    try {
      const res = await provider.ask(question);
      const words = res.answer.split(/(\s+)/);
      let acc = '';
      for (const w of words) {
        acc += w;
        setMessages((m) => m.map((x) => (x.id === aId ? { ...x, content: acc } : x)));
        scrollDown();
        await new Promise((r) => setTimeout(r, 16));
      }
      setMessages((m) =>
        m.map((x) =>
          x.id === aId
            ? {
                ...x,
                content: res.answer,
                citations: res.citations,
                toolsUsed: res.toolsUsed,
                template: res.template,
                streaming: false,
              }
            : x,
        ),
      );
    } catch {
      setMessages((m) =>
        m.map((x) =>
          x.id === aId
            ? { ...x, content: 'The live provider is unavailable. Falling back to the offline assistant.', streaming: false }
            : x,
        ),
      );
    } finally {
      setBusy(false);
      scrollDown();
    }
  };

  useEffect(() => {
    if (seed && seed.trim() && !seededRef.current) {
      seededRef.current = true;
      void send(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const onCite = (c: Citation) => {
    setAskOpen(false);
    navigate(c.route);
  };

  return (
    <div className={s.root} style={embedded ? { padding: '14px 16px' } : undefined}>
      <div className={s.header}>
        <Badge appearance="tint" color="brand" size="small" icon={<ChatSparkle20Regular />}>
          {provider.label}
        </Badge>
        <span>Grounded over the estate telemetry · tool-calling simulation</span>
      </div>

      <div className={s.stream} ref={streamRef}>
        {messages.length === 0 ? (
          <div className={s.empty}>
            <span className={s.emptyTitle}>
              <ChatSparkle20Regular /> Ask about the estate
            </span>
            <span className={s.emptySub}>
              Natural-language questions over accuracy, safety, cost, lifecycle and Agent 365 —
              answered with inline citations you can click through to the source. Suggestions are
              tailored for the <strong>{PERSONA_BY_ID[persona].label}</strong> persona.
            </span>
            <div className={s.chips}>
              {prompts.map((p) => (
                <Button key={p} appearance="outline" className={s.chip} onClick={() => send(p)}>
                  {p}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className={s.msgUser}>
                {m.content}
              </div>
            ) : (
              <div key={m.id} className={s.msgBot}>
                {m.toolsUsed && m.toolsUsed.length > 0 && (
                  <div className={s.tools}>
                    {m.toolsUsed.map((t) => (
                      <Badge key={t} appearance="outline" size="small" className={s.toolChip}>
                        {t}()
                      </Badge>
                    ))}
                  </div>
                )}
                <div className={s.botBubble}>
                  {m.content ? <Rich text={m.content} /> : <Thinking />}
                </div>
                {m.template && !m.streaming && <TemplateCard template={m.template} />}
                {m.citations && m.citations.length > 0 && (
                  <div className={s.citations}>
                    {m.citations.map((c) => (
                      <Button
                        key={c.route + c.label}
                        size="small"
                        appearance="subtle"
                        icon={<ArrowExportRegular />}
                        iconPosition="after"
                        onClick={() => onCite(c)}
                      >
                        {c.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ),
          )
        )}
      </div>

      <div className={s.inputRow}>
        <Input
          style={{ flex: 1 }}
          placeholder="Ask about drift, spend, leaks, budgets, approvals…"
          value={input}
          onChange={(_e, d) => setInput(d.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send(input);
          }}
          disabled={busy}
        />
        <Button
          appearance="primary"
          icon={<Send20Filled />}
          aria-label="Send"
          disabled={busy || !input.trim()}
          onClick={() => send(input)}
        />
      </div>
    </div>
  );
}

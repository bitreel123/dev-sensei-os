import { useRef, useState } from "react";
import type { UIMessage } from "ai";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Database,
  FileText,
  FlaskConical,
  HeartPulse,
  ListFilter,
  Microscope,
  Send,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import robot from "@/assets/assistant-robot.png.asset.json";
import blood from "@/assets/dataset-cancer.png.asset.json";
import brain from "@/assets/dataset-brain.png.asset.json";
import virus from "@/assets/dataset-virus.png.asset.json";
import banner from "@/assets/dataset-banner.png.asset.json";

const prompts = [
  { label: "What are the latest malaria research findings?", icon: Microscope },
  { label: "How does HER2-positive cancer develop?", icon: HeartPulse },
  { label: "Show me the impact of COVID-19 on lungs", icon: Stethoscope },
  { label: "Give me a summary of diabetes research", icon: FlaskConical },
];
const quickPrompts = [
  { text: "Explain lung cancer with recent research", image: banner.url },
  { text: "Explain heart disease and treatment research", image: blood.url },
  { text: "COVID-19 variants and their impact", image: virus.url },
  { text: "How does Alzheimer’s affect the brain?", image: brain.url },
];
const sampleMessages: UIMessage[] = [
  {
    id: "sample-question",
    role: "user",
    parts: [{ type: "text", text: "Show me the effect of malaria on the human body" }],
  },
  {
    id: "sample-answer",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "Malaria parasites enter the body through the bite of an infected mosquito. They first multiply in liver cells, then infect red blood cells. Infection can cause fever and anaemia; severe malaria can affect several organs. The spleen helps filter infected blood cells.",
      },
    ],
  },
];
const summary =
  "Malaria parasites move from the liver to red blood cells. Infection can cause fever and anaemia, while severe disease may affect multiple organs.";

export function AssistantPreview() {
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [summarized, setSummarized] = useState(false);
  const [copied, setCopied] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fillPrompt = (text: string) => {
    setDraft(text);
    setNotice("");
    textarea.current?.focus();
  };
  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(
        summarized
          ? summary
          : sampleMessages
              .filter((m) => m.role === "assistant")
              .flatMap((m) => m.parts.filter((p) => p.type === "text").map((p) => p.text))
              .join("\n"),
      );
      setCopied(true);
    } catch {
      setNotice("Copy is unavailable in this browser.");
    }
  };
  return (
    <div className="jd-assistant-page">
      <div className="jd-assistant-grid">
        <section className="jd-assistant-main" aria-label="Jeradin AI Assistant">
          <header className="jd-assistant-heading">
            <img src={robot.url} alt="Jeradin biomedical assistant" />
            <div>
              <h1>Jeradin AI Assistant</h1>
              <p>Your biomedical research companion</p>
            </div>
            <Activity className="jd-assistant-wave" aria-hidden="true" />
          </header>
          <div className="jd-assistant-welcome">
            <img
              className="jd-assistant-portrait"
              src={robot.url}
              alt="Biomedical robot holding an educational hologram"
            />
            <div className="jd-assistant-greeting">
              <h2>Hello, researcher</h2>
              <p>Ask about biomedical research, diseases and the human body.</p>
              <small>Explore evidence. Understand biology. Connect the findings.</small>
            </div>
          </div>
          <div className="jd-assistant-suggestions">
            {prompts.map((p) => (
              <Button variant="outline" key={p.label} onClick={() => fillPrompt(p.label)}>
                <p.icon />
                <span>{p.label}</span>
              </Button>
            ))}
          </div>
          <div className="jd-assistant-sample-label">
            <span>Educational conversation</span>
            <span>Research education · Not medical advice</span>
          </div>
          <Conversation className="jd-assistant-conversation" initial={false} resize="instant">
            <ConversationContent className="jd-assistant-transcript">
              {sampleMessages.map((message) => (
                <Message
                  key={message.id}
                  from={message.role}
                  className={`jd-assistant-message jd-assistant-message-${message.role}`}
                >
                  {message.role === "assistant" && (
                    <img className="jd-assistant-avatar" src={robot.url} alt="Jeradin" />
                  )}
                  <MessageContent className="jd-assistant-message-content">
                    {message.parts.map((part, index) =>
                      part.type === "text" ? (
                        <MessageResponse key={index}>
                          {message.role === "assistant" && summarized ? summary : part.text}
                        </MessageResponse>
                      ) : null,
                    )}
                    {message.role === "assistant" && (
                      <div className="jd-assistant-findings">
                        <figure>
                          <img
                            src={blood.url}
                            alt="Illustrative blood cells, not a malaria microscopy result"
                          />
                          <figcaption>Illustrative artwork</figcaption>
                        </figure>
                        <div>
                          <h3>Key findings</h3>
                          <ul>
                            <li>
                              <Check />
                              Liver stage precedes blood-cell infection
                            </li>
                            <li>
                              <Check />
                              Blood-cell infection can contribute to anaemia
                            </li>
                            <li>
                              <Check />
                              Severe malaria needs urgent medical care
                            </li>
                          </ul>
                        </div>
                        <div className="jd-assistant-resources">
                          <h3>Related resources</h3>
                          <Button variant="ghost" disabled>
                            <FileText />
                            Research report (PDF)
                          </Button>
                          <Button variant="ghost" disabled>
                            <Database />
                            Data insights (CSV)
                          </Button>
                          <Button asChild variant="ghost">
                            <Link to="/pathogen">
                              <Stethoscope />
                              Pathogen mapping
                              <ArrowRight />
                            </Link>
                          </Button>
                          <small>Exports not connected</small>
                        </div>
                      </div>
                    )}
                  </MessageContent>
                  {message.role === "assistant" && (
                    <MessageActions className="jd-assistant-actions">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSummarized((v) => !v)}
                        aria-pressed={summarized}
                      >
                        <ListFilter />
                        {summarized ? "Full explanation" : "Summarize"}
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/pathogen">
                          <Stethoscope />
                          Show on human model
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setNotice(
                            "Retrieved publications and source citations are not connected yet.",
                          )
                        }
                      >
                        <BookOpen />
                        Cite sources
                      </Button>
                      <MessageAction
                        tooltip={copied ? "Copied" : "Copy explanation"}
                        onClick={() => {
                          void copyAnswer();
                        }}
                      >
                        {copied ? <Check /> : <Copy />}
                      </MessageAction>
                    </MessageActions>
                  )}
                </Message>
              ))}
            </ConversationContent>
            <ConversationScrollButton aria-label="Scroll to latest message" />
          </Conversation>
          <div className="jd-assistant-composer">
            <PromptInput
              onSubmit={() => {
                setNotice(
                  "Live AI replies and account-saved conversations are not connected yet.",
                );
                textarea.current?.focus();
              }}
            >
              <PromptInputTextarea
                ref={textarea}
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about health, research or the human body…"
                aria-label="Ask Jeradin AI"
              />
              <PromptInputFooter>
                <span>
                  <ShieldCheck />
                  Research and education only
                </span>
                <PromptInputSubmit aria-label="Send question" disabled={!draft.trim()}>
                  <Send />
                </PromptInputSubmit>
              </PromptInputFooter>
            </PromptInput>
            {notice && (
              <p className="jd-assistant-notice" role="status">
                {notice}
              </p>
            )}
            <p className="jd-assistant-disclaimer">
              Live AI replies, downloads and saved conversations are not connected yet.
            </p>
          </div>
        </section>
        <aside className="jd-assistant-rail" aria-label="Research prompts">
          <section className="jd-assistant-quick">
            <h2>
              <Microscope />
              Quick prompts
            </h2>
            {quickPrompts.map((p) => (
              <Button variant="ghost" key={p.text} onClick={() => fillPrompt(p.text)}>
                <img src={p.image} alt="" />
                <span>{p.text}</span>
                <ArrowRight />
              </Button>
            ))}
          </section>
          <section className="jd-assistant-capabilities">
            <h2>
              <FlaskConical />
              Research tools
            </h2>
            <span className="jd-tag">Planned</span>
            <ul>
              {[
                "Search scientific evidence",
                "Explain complex topics",
                "Connect findings to anatomy",
                "Cite source publications",
                "Generate research summaries",
              ].map((c) => (
                <li key={c}>
                  <Check />
                  {c}
                </li>
              ))}
            </ul>
          </section>
          <figure className="jd-assistant-rail-art">
            <img src={brain.url} alt="Illustrative brain MRI" />
            <figcaption>
              Evidence.
              <br />
              Understanding.
              <br />
              Discovery.
            </figcaption>
          </figure>
        </aside>
      </div>
    </div>
  );
}

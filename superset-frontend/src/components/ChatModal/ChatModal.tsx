import React, { useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import { useTheme } from '@superset-ui/core';
import Modal from '../Modal';

interface ChatModalProps {
  show: boolean;
  onHide?: () => void;
  title?: string;
}

interface Message {
  reply: boolean;
  message: string;
}

const DEFAULT_SUPERSET_AGENT_URL = 'https://superset-agent.platform.nedra.app/';

function ChatModal({ show, onHide, title }: ChatModalProps) {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [replying, setReplying] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  const [socket, setSocket] = useState<Socket>();
  const [accessToken, setAccessToken] = useState<string>();
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleCloseDialog = React.useCallback(() => {
    if (onHide) {
      onHide();
    }
  }, [onHide]);

  const sendMessage = React.useCallback(
    (message: string) => {
      setMessage('');

      if (socket) {
        const msgs = [...messages, { reply: false, message }];
        setMessages(msgs);
        setTimeout(() => {
          setReplying(true);
        }, 200);

        socket.emit('chat', { content: message });
      }
    },
    [socket, messages],
  );

  const handleKeyDown = (evt: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (evt.key === 'Enter') {
      const target = evt.target as HTMLTextAreaElement;
      if (evt.shiftKey) {
        return true;
      }
      evt.preventDefault();
      evt.stopPropagation();

      if (target.value.length > 0) {
        sendMessage(target.value);
        setTimeout(() => {
          const listElm = messageListRef.current;
          if (listElm) {
            listElm.scrollTop = listElm.scrollHeight;
          }
        }, 30);
      }

      return false;
    }

    return true;
  };

  const handleChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(evt.target.value);
    return true;
  };

  const handleLogin = () => {
    fetch('/api/v1/security/login', {
      method: 'post',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: usernameRef.current?.value,
        password: passwordRef.current?.value,
        provider: 'db',
        refresh: true,
      }),
    })
      .then(it => it.json())
      .then(resp => {
        setAccessToken(resp.access_token);

        const uri =
          process.env.SUPERSET_LLM_AGENT_PROXY || DEFAULT_SUPERSET_AGENT_URL;
        const socket = io(uri, {
          extraHeaders: {
            Authorization: `Bearer ${resp.access_token}`,
          },
        });
        socket.on('connect', () => {
          console.log(`socket connected`, socket);
        });
        socket.on('disconnect', () => {
          console.log('socket disconnected');
        });
        socket.on('chat', (reply: any) => {
          try {
            setMessages([...msgs, { reply: true, message: reply.content }]);
          } catch (e) {
            console.error(e);
          } finally {
            setReplying(false);
          }
        });
        setSocket(socket);
      })
      .catch(e => alert(`Login failed: ${e.message}`));
  };

  return (
    <Modal
      show={show}
      onHandledPrimaryAction={handleCloseDialog}
      onHide={handleCloseDialog}
      title={
        title || (
          <div style={{ display: 'flex', gap: '10px' }}>
            <span>Ask GPT to help</span>
            {!accessToken && (
              <>
                <input ref={usernameRef} type="text" placeholder="Username" />
                <input
                  ref={passwordRef}
                  type="password"
                  placeholder="Password"
                />
                <button type="button" onClick={handleLogin}>
                  Login
                </button>
              </>
            )}
          </div>
        )
      }
      responsive
      disablePrimaryButton
    >
      <div
        ref={messageListRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 8px',
          marginBottom: '10px',
          gap: '1rem',
          height: '500px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {messages.map((msg, idx) =>
          msg.reply ? (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'start',
              }}
            >
              <div
                style={{
                  justifyContent: 'end',
                  backgroundColor: theme.colors.success.light1,
                  color: theme.colors.grayscale.dark1,
                  padding: '0.1rem 1rem',
                  borderRadius: '4px',
                  textAlign: 'left',
                }}
              >
                {msg.message.split(/\r?\n/).map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            </div>
          ) : (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'end',
              }}
            >
              <div
                style={{
                  justifyContent: 'end',
                  backgroundColor: theme.colors.primary.light1,
                  color: theme.colors.grayscale.dark1,
                  padding: '0 1rem',
                  borderRadius: '4px',
                  textAlign: 'right',
                }}
              >
                {msg.message.split(/\r?\n/).map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            </div>
          ),
        )}
        {replying && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'start',
            }}
          >
            <div
              style={{
                justifyContent: 'end',
                backgroundColor: theme.colors.success.light1,
                color: theme.colors.grayscale.dark1,
                padding: '0.1rem 1rem',
                borderRadius: '4px',
                textAlign: 'left',
              }}
            >
              .....
            </div>
          </div>
        )}
      </div>
      <textarea
        placeholder="Ask a question. e.g. Create a inventory dashboard with a table to display part and quantity."
        value={message}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        style={{
          backgroundColor: theme.colors.grayscale.light5,
          border: `1px ${theme.colors.grayscale.base} solid`,

          padding: '8px 8px',
          height: '3rem',
          width: '100%',
          outline: 'none',
          resize: 'none',
        }}
      />
    </Modal>
  );
}

export default ChatModal;

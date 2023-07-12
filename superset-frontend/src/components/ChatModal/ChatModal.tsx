import React, { useRef, useState } from 'react';
import { io } from 'socket.io-client';
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

function ChatModal({ show, onHide, title }: ChatModalProps) {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [replying, setReplying] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  const handleCloseDialog = React.useCallback(() => {
    if (onHide) {
      onHide();
    }
  }, [onHide]);

  const socket = io('ws://localhost:8888');
  socket.on('connect', () => {
    console.log(`socket connected`, socket);
  });
  socket.on('disconnect', () => {
    console.log('socket disconnected');
  });
  socket.on('connetct_error', (err: Error) => {
    console.error('websocket', err);
  });

  const sendMessage = React.useCallback(
    (message: string) => {
      setMessage('');

      const msgs = [...messages, { reply: false, message }];
      setMessages(msgs);
      setTimeout(() => {
        setReplying(true);
      }, 200);

      socket.emit('chat', { content: message }, (reply: any) => {
        setMessages([...msgs, { reply: true, message: reply.content }]);
        setReplying(false);
      });
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
      sendMessage(target.value);
      setTimeout(() => {
        const listElm = messageListRef.current;
        if (listElm) {
          listElm.scrollTop = listElm.scrollHeight;
        }
      }, 30);

      return false;
    }

    return true;
  };

  const handleChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(evt.target.value);
    return true;
  };

  return (
    <Modal
      show={show}
      onHide={handleCloseDialog}
      title={title || 'Ask GPT to help'}
      disablePrimaryButton
      responsive
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
                  backgroundColor: theme.colors.primary.dark1,
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
                  padding: '0.1rem 1rem',
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
                backgroundColor: theme.colors.primary.dark1,
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
          borderRadius: '4px',
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

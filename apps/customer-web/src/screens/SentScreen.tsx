import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useCustomer } from "../context";
import { CheckIcon, WhatsAppIcon } from "../icons";
import { localPhone } from "../domain/store";
import { whatsAppUrl } from "../domain/whatsapp";
import { BackButton } from "../ui";

export function SentScreen() {
  const navigate = useNavigate();
  const { sentOrder, setSentOrder, cart } = useCustomer();
  const [copied, setCopied] = useState("");

  if (!sentOrder)
    return (
      <>
        <div className="top">
          <BackButton to="/cart" label="Back to cart" />
        </div>
        <p className="empty" style={{ marginTop: 24 }}>
          There’s no order message to send yet.{" "}
          <Link className="linkBtn" to="/cart">
            Go to your cart
          </Link>
        </p>
      </>
    );

  async function copy() {
    try {
      await navigator.clipboard.writeText(sentOrder!.message);
      setCopied("Copied");
    } catch {
      const element = document.getElementById("msgText");
      const selection = window.getSelection();
      if (element && selection) {
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      setCopied("Selected, copy now");
    }
  }

  return (
    <>
      <div className="top">
        <BackButton to="/cart" label="Back to cart" />
      </div>
      <div className="done">
        <div className="tick">
          <span>
            <CheckIcon />
          </span>
        </div>
        <h1>Order ready to send</h1>
        <p>
          Tap below to open WhatsApp and press send. {sentOrder.storeName} only
          gets your order once you send it there.
        </p>
        <a
          className="cta"
          href={whatsAppUrl(sentOrder.whatsappE164, sentOrder.message)}
          rel="noopener noreferrer"
          target="_blank"
        >
          <WhatsAppIcon />
          Open WhatsApp
        </a>
        <p className="small">
          WhatsApp didn’t open? Copy the message and send it to{" "}
          <b className="selectable">{localPhone(sentOrder.whatsappE164)}</b>, or
          call that number.
        </p>
        <div className="msg" id="msgText">
          {sentOrder.message}
        </div>
        <div className="row2">
          <button
            className="cta ghost cta-sm"
            type="button"
            onClick={() => void copy()}
          >
            {copied || "Copy message"}
          </button>
          <button
            className="cta ghost cta-sm"
            type="button"
            onClick={() => {
              cart?.getState().clear();
              setSentOrder(null);
              navigate("/");
            }}
          >
            New order
          </button>
        </div>
      </div>
    </>
  );
}

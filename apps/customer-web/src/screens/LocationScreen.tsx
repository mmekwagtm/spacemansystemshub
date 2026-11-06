import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useCustomer } from "../context";
import { PinIcon } from "../icons";
import { parsePin, pinLabel, pinUrl } from "../domain/location";
import { BackButton } from "../ui";

export function LocationScreen() {
  const location = useLocation();
  const back = (location.state as { from?: string } | null)?.from ?? "/";
  const { pin, setPin } = useCustomer();
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState(pin?.note ?? "");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  function use() {
    const result = parsePin(draft, note);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setPin(result.pin);
    setWarning(result.warning);
    setDraft("");
    setError("");
  }

  return (
    <>
      <div className="top">
        <BackButton to={back} />
        <span className="title">Exact location</span>
      </div>
      <h1 className="h1 spaced">Pin your exact spot</h1>
      <p className="desc">
        Drivers find you faster with a map pin, especially in blocks and
        sections without clear street numbers.
      </p>
      {pin ? (
        <div className="pinned">
          <i aria-hidden="true">
            <PinIcon />
          </i>
          <div>
            <b>Pinned</b>
            <span className="small">{pinLabel(pin)}</span>
            <div className="actions">
              <a
                className="obtn"
                href={pinUrl(pin)}
                rel="noopener noreferrer"
                target="_blank"
              >
                <PinIcon />
                Check on map
              </a>
              <button
                className="obtn"
                type="button"
                onClick={() => {
                  setPin(null);
                  setWarning("");
                }}
              >
                Remove pin
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {warning ? <div className="note">{warning}</div> : null}
      <div className="sec">
        <h2>{pin ? "Change the pin" : "How to pin it"}</h2>
      </div>
      <ol className="steps">
        <li>
          Tap <b>Open Google Maps</b> below. It opens in a new tab.
        </li>
        <li>Press and hold on your gate or door to drop a red pin.</li>
        <li>
          Tap <b>Share</b> and copy the link, or copy the numbers shown at the
          top (like -25.4987, 28.0934).
        </li>
        <li>Come back here and paste it below.</li>
      </ol>
      <a
        className="cta spaced"
        href="https://www.google.com/maps/search/?api=1&query=Mabopane%2C%20Gauteng"
        rel="noopener noreferrer"
        target="_blank"
      >
        Open Google Maps
      </a>
      <div className="stack">
        <label className="slbl" htmlFor="locIn">
          Google Maps link or coordinates
        </label>
        <input
          autoComplete="off"
          className="field"
          id="locIn"
          inputMode="url"
          placeholder="Paste here"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError("");
          }}
        />
        {error ? (
          <div className="err" role="alert">
            {error}
          </div>
        ) : null}
        <button className="cta ghost cta-sm" type="button" onClick={use}>
          Use this location
        </button>
        <label className="slbl" htmlFor="locNote">
          Landmark for the driver
        </label>
        <input
          className="field"
          id="locNote"
          maxLength={120}
          placeholder="Optional, e.g. green gate next to the tuck shop"
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            if (pin)
              setPin({ ...pin, note: event.target.value.trim().slice(0, 120) });
          }}
        />
        <Link className="cta" to={back}>
          Done
        </Link>
        <p className="small">
          Your pin stays on this phone only. It’s added to your order message
          when you send it.
        </p>
      </div>
    </>
  );
}

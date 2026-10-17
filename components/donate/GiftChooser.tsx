"use client";

import { useState } from "react";
import styles from "./GiftChooser.module.css";

const AMOUNTS = [25, 50, 100, 250];

export function GiftChooser() {
  const [frequency, setFrequency] = useState<"once" | "monthly">("once");
  const [amount, setAmount] = useState(50);

  return (
    <div className={styles.wrap} data-reveal>
      <div className={styles.toggle} role="group" aria-label="Gift frequency">
        <button type="button" data-on={frequency === "once"} onClick={() => setFrequency("once")}>
          One time
        </button>
        <button type="button" data-on={frequency === "monthly"} onClick={() => setFrequency("monthly")}>
          Monthly
        </button>
      </div>
      <div className={styles.amounts}>
        {AMOUNTS.map((value) => (
          <button key={value} type="button" data-on={amount === value} onClick={() => setAmount(value)}>
            <span>${value}</span>
            <small>{frequency === "monthly" ? "each month" : "one time"}</small>
          </button>
        ))}
      </div>
      <p className={styles.note}>
        Suggested gift: ${amount} {frequency === "monthly" ? "each month" : "once"}. PayPal opens next so you can confirm
        the amount. $25 helps with books. $100 helps with a term fee.
      </p>
      <a className={styles.sticky} href="#donate-paypal">
        Suggested gift: ${amount} {frequency === "monthly" ? "each month" : "once"}
      </a>
    </div>
  );
}

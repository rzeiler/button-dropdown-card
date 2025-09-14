// Haupt-Karte
class ButtonDialogCard extends HTMLElement {
  setConfig(config) {
    console.log(config.entities);
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("Bitte 'entities' definieren");
    }
    this.config = config;
  }

  // Sichtbarkeits-Check basierend auf Bedingungen
  _checkVisibility(hass) {
    if (!this.config.visibility) return true;

    return this.config.visibility.every((condition) => {
      const state = hass.states[condition.entity];
      if (!state) return false;

      switch (condition.state_not) {
        case undefined:
          return condition.state ? state.state === condition.state : true;
        default:
          return state.state !== condition.state_not;
      }
    });
  }

  // Fallback: Eigene relative Zeit Funktion
  _formatRelativeTime(diffMs) {
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "gerade eben";
    if (minutes < 60)
      return `vor ${minutes} Min${minutes !== 1 ? "uten" : "ute"}`;
    if (hours < 24) return `vor ${hours} Stunde${hours !== 1 ? "n" : ""}`;
    if (days < 7) return `vor ${days} Tag${days !== 1 ? "en" : ""}`;

    const weeks = Math.floor(days / 7);
    return `vor ${weeks} Woche${weeks !== 1 ? "n" : ""}`;
  }

  set hass(hass) {
    this._hass = hass;

    // Sichtbarkeits-Check
    const isVisible = this._checkVisibility(hass);
    this.style.display = isVisible ? "flex" : "none";

    if (!isVisible) return;

    let last_triggered = [];

    const latestExecution = this._getLatestFromList(this.config.entities);

    this.config.entities.forEach((item) => {
      const ent = typeof item === "string" ? item : item.entity;
      const st = this._hass.states[ent];
      last_triggered.push(st?.attributes?.last_triggered || st?.last_changed);
    });

    if (!this.rendered) {
      const ent = this.config.entities[0]?.entity;
      const st = this._hass.states[ent];
      this.innerHTML = "";

      this.appendChild(this._getStaticStyle());

      Object.assign(this.style, {
        background:
          "var(--ha-card-background, var(--card-background-color, #fff))",
        backdropFilter: "var(--ha-card-backdrop-filter, none)",
        boxShadow: "var(--ha-card-box-shadow, none)",
        boxSizing: "border-box",
        borderRadius: "var(--ha-card-border-radius, 12px)",
        borderWidth: "var(--ha-card-border-width, 1px)",
        borderStyle: "solid",
        borderColor:
          "var(--ha-card-border-color, var(--divider-color, #e0e0e0))",
        color: "var(--primary-text-color)",
        transition: "0.3s ease-out",
        position: "relative",
        alignItems: "center",
        height: "100%",
        padding: "5px 10px",
        position: "relative" /* Referenz für absolute */,
        overflow: "hidden" /* Icon bleibt in Card */,
      });

      this.stateIcon = document.createElement("ha-icon");
      this.stateIcon.style.position = "absolute";
      this.stateIcon.icon = this.config.icon;

      this.stateIcon.style.setProperty("--mdc-icon-size", "32px");
      this.appendChild(this.stateIcon);

      this.stateIconDummy = document.createElement("ha-icon");
      this.stateIconDummy.style.width = "36px";
      this.appendChild(this.stateIconDummy);

      this.info = document.createElement("ha-info");
      this.info.style.padding = "0 10px";
      //info.style.flexGrow = "1";

      this.info.style.transition = "all 0.5s ease-out allow-discrete";

      this.appendChild(this.info);

      const primary = document.createElement("div");
      primary.innerText = this.config.title;
      this.info.appendChild(primary);

      const lastTriggered = new Date(latestExecution);
      const now = new Date();
      const diff = now - lastTriggered;
      const relativeTimeManual = this._formatRelativeTime(diff);

      const secondary = document.createElement("div");
      secondary.style.fontSize = "90%";
      secondary.innerText = relativeTimeManual;
      this.info.appendChild(secondary);

      const open = () => this._openDialog();
      this.addEventListener("click", open);
      this.addEventListener("touchend", open);

      this.rendered = true;
    }

    this._updateIconAnimation();
  }

  _getDynamicCSS() {
    const style = document.createElement("style");
    style.textContent = `
        @media (min-width: 600px) and (min-height: 501px) {
            ha-dialog {
                --mdc-dialog-min-width: 580px;
                --mdc-dialog-max-width: 580px;
                --mdc-dialog-max-height: calc(100% - 72px);
            }
        }
        ha-dialog {
            --vertical-align-dialog: flex-start;
            --dialog-surface-margin-top: 40px;
            --dialog-content-padding: 0;
        }
        
         `;

    return style;
  }

  _getStaticStyle() {
    const style = document.createElement("style");
    style.textContent = `
        button-dropdown {
         --icon-size: 24px;
         --padding: 8px;
        }

        .move {
          animation: rectangleMove 8s linear infinite;
          transform-origin: center;
        }

        @keyframes rectangleMove {
          0% { top: 0; left: 0; transform: rotate(0deg); }    /* Oben links */
          1% { top: 0; left: 0;transform: rotate(90deg); }
          25%  { top: 0; left: calc(100% - var(--icon-size) - var(--padding)) ; }   /* Oben rechts */
          26% { transform: rotate(90deg); }
          27% { transform: rotate(180deg); }
          50%  { top: calc(100% - var(--icon-size) - var(--padding)); left: calc(100% - var(--icon-size) - var(--padding)); } /* Unten rechts */
          51% { transform: rotate(180deg); }
          52% { transform: rotate(270deg); }
          75%  { top: calc(100% - var(--icon-size) - var(--padding)); left: 0;  }   /* Unten links */
          76% { transform: rotate(270deg); }
          77% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); top: 0; left: 0;}                 /* Zurück zu Start */
        }
         `;

    return style;
  }

  _serviceCall(domain, ent, listItem) {
    var cs = null;
    if (domain === "script") {
      cs = this._hass.callService(domain, "turn_on", {
        entity_id: ent,
      });
    } else if (domain === "scene") {
      cs = this._hass.callService(domain, "turn_on", {
        entity_id: ent,
      });
    } else {
      cs = this._hass.callService(domain, "toggle", {
        entity_id: ent,
      });
    }

    cs.then((d) => {
      console.log("then", d);
      this.dialog.remove();
    });
  }

  _openDialog() {
    this.dialog = document.createElement("ha-dialog");

    this.dialog.open = true;
    this.dialog.hideActions = true;
    this.dialog.appendChild(this._getDynamicCSS());

    // Set the title directly on the dialog's heading property
    if (this.config.dialog_title != undefined) {
      this.dialog.heading = this.config.dialog_title;
    }

    // To enable closing the dialog by clicking the background
    this.dialog.scrimClickAction = true;

    // Container mit Entities
    const container = document.createElement("ha-list");

    this.config.entities.forEach((item) => {
      const ent = typeof item === "string" ? item : item.entity;
      const st = this._hass.states[ent];
      if (!st) return;

      const listItem = document.createElement("ha-md-list-item");
      listItem.classList.add("two-line");
      listItem.type = "button";
      listItem.interactive = true;
      listItem.multiline = true;

      const headline = document.createElement("span");
      headline.innerText = item.title || st.attributes.friendly_name || ent;
      headline.slot = "headline";
      listItem.appendChild(headline);

      const lastTriggered = new Date(st.attributes.last_triggered);
      const now = new Date();
      const diff = now - lastTriggered;
      const relativeTimeManual = this._formatRelativeTime(diff);

      const supportingText = document.createElement("span");
      supportingText.innerText = relativeTimeManual;
      supportingText.slot = "supporting-text";
      listItem.appendChild(supportingText);

      const domain = ent.split(".")[0];

      const text = document.createElement("span");
      text.innerText = domain;
      text.slot = "trailing-supporting-text";
      listItem.appendChild(text);

      // ha-state-icon Element erstellen
      const stateIcon = document.createElement("ha-state-icon");
      stateIcon.slot = "start";
      // Parameter setzen
      stateIcon.hass = this._hass; // WICHTIG: hass Objekt
      stateIcon.stateObj = st; // WICHTIG: state Objekt

      // Optionale Parameter
      stateIcon.style.setProperty("--mdc-icon-size", "22px"); // Icon Größe
      stateIcon.style.color = st.state === "on" ? "orange" : "gray";

      // Zum Container hinzufügen
      listItem.appendChild(stateIcon);

      container.appendChild(listItem);

      // Aktion aufrufen
      const call = () => this._serviceCall(domain, ent, listItem);
      listItem.addEventListener("click", call);
      listItem.addEventListener("touchend", call);
    });

    this.dialog.appendChild(container);

    document.body.appendChild(this.dialog);
  }

  getCardSize() {
    return 1;
  }

  _updateIconAnimation() {
    if (!this.config.state_on_entity || !this.stateIcon) return;

    const isOn = this._hass.states[this.config.state_on_entity]?.state === "on";
    this.stateIcon.classList.toggle("move",isOn);    
  }

  _getLatestFromList(entityIds) {
    const dates = entityIds
      .map((entityId) => {
        const state = this._hass.states[entityId.entity];
        const lastTime =
          state?.attributes?.last_triggered || state?.last_changed;
        return lastTime ? new Date(lastTime) : null;
      })
      .filter((date) => date !== null)
      .sort((a, b) => b - a); // Absteigende Sortierung
    return dates[0] || null; // Jüngstes Datum
  }

  // The rules for sizing your card in the grid in sections view
  getGridOptions() {
    return {
      rows: 1,
      columns: 6,
    };
  }

  static getStubConfig() {
    return {
      title: "Meine Aktionen",
      icon: "mdi:menu",
      entities: [],
    };
  }
}

// Registrierung
customElements.define("button-dropdown", ButtonDialogCard);

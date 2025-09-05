// Haupt-Karte
class ButtonDialogCard extends HTMLElement {
  setConfig(config) {
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

  set hass(hass) {
    this._hass = hass;

    // Sichtbarkeits-Check
    const isVisible = this._checkVisibility(hass);
    this.style.display = isVisible ? "" : "none";

    if (!isVisible) return;

    if (!this.rendered) {

      const tile = document.createElement("hui-tile-card");
      tile.setConfig({
        entity: this.config.entities[1]?.entity,
        name: this.config.title || "Aktionen",
        icon: this.config.icon,
        tap_action: { action: "none" },
        icon_tap_action: { action: "none" },
        state_content: [],
      });
      tile.hass = hass;

      const open = () => this._openDialog();
      tile.addEventListener("click", open);
      tile.addEventListener("touchend", open);

      this.innerHTML = "";
      this.appendChild(tile);

      this.rendered = true;
    }
  }

  _openDialog() {
    const dialog = document.createElement("ha-dialog");
    dialog.open = true;
    dialog.hideActions = true;

    // Set the title directly on the dialog's heading property
    dialog.heading = this.config.title || "Aktionen";

    // To enable closing the dialog by clicking the background
    dialog.scrimClickAction = true;

    // Container mit Entities
    const container = document.createElement("div");
    container.style.padding = "0px";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "6px";
    dialog.style.padding = "0px";

    this.config.entities.forEach((item) => {
      const ent = typeof item === "string" ? item : item.entity;
      const st = this._hass.states[ent];
      if (!st) return;

      const tile = document.createElement("hui-tile-card");
      tile.setConfig({
        entity: ent,
        name: item.title || st.attributes.friendly_name || ent,
        icon: item.icon || st.attributes.icon,
        state_content: "last_triggered",
      });

      tile.hass = this._hass;
      container.appendChild(tile);
    });

    dialog.appendChild(container);

    // Dialog wieder entfernen, wenn geschlossen
    dialog.addEventListener("closed", () => dialog.remove());

    document.body.appendChild(dialog);
  }

  getCardSize() {
    return 1;
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

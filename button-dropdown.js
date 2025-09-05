class ButtonDropdownCard extends HTMLElement {
  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("Bitte 'entities' in der Konfiguration angeben");
    }
    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;

    if (!this.content) {
      this.innerHTML = `
        <ha-card header="${this.config.title || "Dropdown"}">
          <div id="dropdown" style="padding: 16px;">
            <button id="main-btn">Aktionen ▾</button>
            <div id="menu" style="display:none; background:#fff; border:1px solid #ccc; border-radius:8px; margin-top:5px;"></div>
          </div>
        </ha-card>
      `;

      this.content = this.querySelector("#menu");
      this.querySelector("#main-btn").addEventListener("click", () => {
        this.content.style.display = this.content.style.display === "none" ? "block" : "none";
      });
    }

    // Menü neu aufbauen
    this.content.innerHTML = "";

    this.config.entities.forEach(item => {
      const ent = typeof item === "string" ? item : item.entity;
      const st = hass.states[ent];
      if (!st) return;

      const name = st.attributes.friendly_name || ent;
      const btn = document.createElement("button");
      btn.textContent = name;
      btn.style.display = "block";
      btn.style.width = "100%";
      btn.style.padding = "8px";
      btn.style.border = "none";
      btn.style.background = "transparent";
      btn.style.cursor = "pointer";

      // Service abhängig von Domain wählen
      btn.addEventListener("click", () => {
        const domain = ent.split(".")[0];
        if (domain === "button") {
          hass.callService("button", "press", { entity_id: ent });
        } else if (domain === "switch") {
          hass.callService("switch", "toggle", { entity_id: ent });
        } else if (domain === "script") {
          hass.callService("script", "turn_on", { entity_id: ent });
        } else if (domain === "light") {
          hass.callService("light", "toggle", { entity_id: ent });
        } else {
          console.warn("Keine Aktion für Domain:", domain);
        }
      });

      this.content.appendChild(btn);
    });
  }

  getCardSize() {
    return 2;
  }
}

customElements.define("button-dropdown", ButtonDropdownCard);
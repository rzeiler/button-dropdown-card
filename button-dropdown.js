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
        <ha-card>
          <div id="header" style="display:flex; align-items:center; padding:8px 16px;">
            ${this.config.icon ? `<ha-icon icon="${this.config.icon}" style="margin-right:8px;"></ha-icon>` : ""}
            <span class="card-title" style="font-weight:bold;">${this.config.title || ""}</span>
          </div>
          <div id="dropdown" style="padding: 8px 16px;">
            <button id="main-btn" style="padding:8px 12px; border:none; border-radius:6px; background:#03a9f4; color:white; cursor:pointer;">
              Aktionen ▾
            </button>
            <div id="menu" style="display:none; background:#fff; border:1px solid #ccc; border-radius:8px; margin-top:5px; min-width:180px; box-shadow:0 2px 5px rgba(0,0,0,0.2);"></div>
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

      // Defaults setzen
      const title = item.title || st.attributes.friendly_name || ent;
      const icon = item.icon || st.attributes.icon || "mdi:circle";

      // Menü-Button bauen
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.padding = "8px";
      row.style.cursor = "pointer";

      const icn = document.createElement("ha-icon");
      icn.setAttribute("icon", icon);
      icn.style.marginRight = "8px";

      const lbl = document.createElement("span");
      lbl.textContent = title;

      row.appendChild(icn);
      row.appendChild(lbl);

      // Klick-Aktion
      row.addEventListener("click", () => {
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
        this.content.style.display = "none"; // Menü schließen
      });

      this.content.appendChild(row);
    });
  }

  getCardSize() {
    return 2;
  }
}

customElements.define("button-dropdown", ButtonDropdownCard);

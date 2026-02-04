FROM node:20-bookworm

# ---------- system packages ----------
RUN apt-get update && apt-get install -y --no-install-recommends \
      g++ \
      make \
      zsh \
      tmux \
      curl \
      gnupg \
    && rm -rf /var/lib/apt/lists/*

# ---------- GitHub CLI ----------
RUN ARCH=$(dpkg --print-architecture) \
    && LATEST=$(curl -fsSL -o /dev/null -w "%{url_effective}" \
        https://github.com/cli/cli/releases/latest | sed 's|.*/||') \
    && curl -fsSL \
        "https://github.com/cli/cli/releases/download/${LATEST}/gh_${LATEST#v}_linux_${ARCH}.deb" \
        -o /tmp/gh.deb \
    && dpkg -i /tmp/gh.deb \
    && rm /tmp/gh.deb

# ---------- Claude Code ----------
RUN npm install -g @anthropic-ai/claude-code

# ---------- non-root user ----------
RUN useradd -ms /bin/zsh dev
USER dev

# ---------- Rust (per-user install) ----------
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
      | sh -s -- -y --default-toolchain stable
ENV PATH="/home/dev/.cargo/bin:${PATH}"

WORKDIR /workspaces/ahc-vdsl

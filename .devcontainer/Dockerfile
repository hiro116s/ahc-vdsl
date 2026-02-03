FROM node:20-bookworm

# ---------- system packages ----------
RUN apt-get update && apt-get install -y --no-install-recommends \
      g++ \
      make \
      zsh \
      curl \
      gnupg \
    && rm -rf /var/lib/apt/lists/*

# ---------- GitHub CLI ----------
RUN curl -fsSL https://cli.github.com/packages/pgp/cli.github.com.key \
      | gpg --dearmor -o /usr/share/keyrings/cli-github-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/cli-github-archive-keyring.gpg] \
            https://cli.github.com/packages/deb stable main" \
      | tee /etc/apt/sources.list.d/cli.github.list > /dev/null \
    && apt-get update && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# ---------- non-root user ----------
RUN useradd -ms /bin/zsh dev
USER dev

# ---------- Rust (per-user install) ----------
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
      | sh -s -- -y --default-toolchain stable
ENV PATH="/home/dev/.cargo/bin:${PATH}"

# ---------- Claude Code ----------
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /workspace

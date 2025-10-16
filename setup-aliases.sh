#!/bin/bash

# Mockup Screenshot Tool エイリアス設定スクリプト

TOOL_DIR="/Users/masayahirano/script/AI-Tools/mockup-screenshot-tool"
SHELL_RC="$HOME/.zshrc"

# .zshrcが存在しない場合は作成
if [ ! -f "$SHELL_RC" ]; then
    touch "$SHELL_RC"
fi

# 既にエイリアスが設定されているかチェック
if grep -q "mst-capture" "$SHELL_RC"; then
    echo "✓ エイリアスは既に設定されています"
    exit 0
fi

# エイリアスを追加
cat >> "$SHELL_RC" << 'EOF'

# Mockup Screenshot Tool
alias mst-capture="node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/capture.js"
alias mst-annotate="node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/annotate.js"
alias mst-pdf="node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/pdf.js"
EOF

echo "✓ エイリアスを $SHELL_RC に追加しました"
echo ""
echo "以下のコマンドで設定を反映してください："
echo "  source ~/.zshrc"
echo ""
echo "使い方："
echo "  mst-capture    # スクリーンショット撮影"
echo "  mst-annotate   # アノテーション追加"
echo "  mst-pdf        # PDF生成"

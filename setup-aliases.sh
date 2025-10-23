#!/bin/bash

# mio_sc_capture エイリアス設定スクリプト

TOOL_DIR="/Users/masayahirano/script/AI-Tools/mio_sc_capture"
SHELL_RC="$HOME/.zshrc"

# .zshrcが存在しない場合は作成
if [ ! -f "$SHELL_RC" ]; then
    touch "$SHELL_RC"
fi

# 既にエイリアスが設定されているかチェック
if grep -q "msc-capture" "$SHELL_RC"; then
    echo "✓ エイリアスは既に設定されています"
    exit 0
fi

# エイリアスを追加
cat >> "$SHELL_RC" << 'EOF'

# mio_sc_capture
alias msc-capture="node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/capture.js"
alias msc-record="node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/record-video.js"
alias msc-annotate="node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/annotate.js"
alias msc-pdf="node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/pdf.js"
alias msc-pdf-detail="node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/pdf-detailed.js"
alias msc-spec="node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/spec-sheet.js"
EOF

echo "✓ エイリアスを $SHELL_RC に追加しました"
echo ""
echo "以下のコマンドで設定を反映してください："
echo "  source ~/.zshrc"
echo ""
echo "使い方："
echo "  msc-capture      # スクリーンショット撮影"
echo "  msc-record       # 動画録画"
echo "  msc-annotate     # アノテーション追加"
echo "  msc-pdf          # PDF生成（シングルページ）"
echo "  msc-pdf-detail   # PDF生成（詳細版・2ページ構成）"
echo "  msc-spec         # 画面仕様書（Excel）生成"

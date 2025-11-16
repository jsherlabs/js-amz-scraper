#!/bin/bash


echo "🚀 Pushing js-amz-scraper to GitHub..."
echo ""

if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the js-amz-scraper directory."
    exit 1
fi

if [ ! -d ".git" ]; then
    echo "❌ Error: Git repository not initialized."
    exit 1
fi

if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ Error: Git remote 'origin' not configured."
    echo "Run: git remote add origin https://github.com/jslabxyz/js-amz-scraper.git"
    exit 1
fi

echo "✅ Git repository configured"
echo "📦 Remote: $(git remote get-url origin)"
echo ""

echo "📤 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 Repository: https://github.com/jslabxyz/js-amz-scraper"
    echo ""
    echo "Next steps:"
    echo "1. Visit your repository on GitHub"
    echo "2. Add topics/tags for better discoverability"
    echo "3. Enable GitHub Pages if you want a website"
    echo "4. Set up GitHub Actions for CI/CD (optional)"
else
    echo ""
    echo "❌ Push failed. Please check the error message above."
    echo ""
    echo "Common issues:"
    echo "1. Repository doesn't exist on GitHub - create it first at https://github.com/new"
    echo "2. Authentication failed - check your GitHub credentials"
    echo "3. Permission denied - ensure you have write access to jslabxyz organization"
fi

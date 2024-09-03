# NgodingBang Blog

[![License](https://badgen.net/github/license/ngodingbang/ngodingbang.github.io "License")](LICENSE.md)
[![Continuous Integration](https://github.com/ngodingbang/ngodingbang.github.io/actions/workflows/ci.yml/badge.svg "Continuous Integration")](https://github.com/ngodingbang/ngodingbang.github.io/actions/workflows/ci.yml)
[![Continuous Deployment](https://github.com/ngodingbang/ngodingbang.github.io/actions/workflows/cd.yml/badge.svg "Continuous Deployment")](https://github.com/ngodingbang/ngodingbang.github.io/actions/workflows/cd.yml)

Repository of [NgodingBang blog](https://ngodingbang.my.id) using Hugo and Notion.

## Requirement

- [Node.js](https://nodejs.org) ^20.17.0
- [Hugo](https://gohugo.io) ^0.134.0
- [Notion](https://www.notion.so)

## Installation

To get started using this app in your localhost, simply paste this command into your terminal:

```bash
git clone https://github.com/ngodingbang/ngodingbang.github.io.git && cd ngodingbang.github.io
cp .env.example .env
npm install
```

Then read the full documentation of how to pull your Notion document into the repository [here](https://github.com/HEIGE-PCloud/Notion-Hugo).

## Getting Started

Make sure you already have [Hugo](https://gohugo.io) on the localhost. Then, pull all Notion document and run the development server:

```bash
npm run pull-content
npm run dev
```

Open http://localhost:1313 with your browser to see the result.

## Changelog

You can read the changelog [here](CHANGELOG.md).

## License

You can read the license [here](LICENSE.md).

## Contributor

- [Ngoding Bang](https://github.com/ngodingbang)
- [Septianata Rizky Pratama](https://github.com/ianriizky)

## Credits

- [Notion-Hugo](https://github.com/HEIGE-PCloud/Notion-Hugo)

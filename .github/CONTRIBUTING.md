# Contributing to PetPal 🐾

Thank you for your interest in contributing to PetPal! We welcome contributions from the community.

## 🚀 Ways to Contribute

- 🐛 **Bug Reports**: Found a bug? Report it!
- 💡 **Feature Requests**: Have an idea? Share it!
- 🔧 **Code Contributions**: Submit pull requests
- 📖 **Documentation**: Improve docs and guides
- 🐾 **Pet Data**: Help expand our animal database
- 🧪 **Testing**: Help test new features

## 🐛 Reporting Bugs

1. Check if the bug already exists in [Issues](https://github.com/your-org/petpal/issues)
2. Use the Bug Report template
3. Include:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

## 💡 Feature Requests

1. Check existing [Issues](https://github.com/your-org/petpal/issues) for similar requests
2. Use the Feature Request template
3. Describe:
   - The feature you'd like
   - Why it would be useful
   - How you envision it working

## 🔧 Code Contributions

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-org/petpal.git
cd petpal

# Install every workspace at once (backend, web, mobile)
npm install

# Everything from the root: lint, typecheck, tests and builds
npm run verify
```

### Development Workflow

1. **Create a branch**: `git checkout -b feature/amazing-feature`
2. **Make changes**: Follow our coding standards
3. **Add tests**: Ensure your changes have tests
4. **Run tests**: `npm test` in each package
5. **Commit**: Use conventional commit messages
6. **Push**: `git push origin feature/amazing-feature`
7. **Pull Request**: Open a PR with clear description

### Coding Standards

- **TypeScript**: All new code must be properly typed
- **Tests**: Add tests for new features (aim for 80%+ coverage)
- **ESLint**: Follow the existing code style
- **Documentation**: Update README for new features or API changes
- **Commits**: Use conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)

### Areas for Contribution

- 🐾 **New Pet Types**: Add support for more animals
- 🥗 **Food Database**: Expand the food safety database
- 🤖 **AI Improvements**: Enhance AI analysis accuracy
- 🎨 **UI/UX**: Improve user interface and experience
- 📱 **Mobile Features**: Add camera recognition, notifications
- 🔒 **Security**: Improve authentication and data protection
- 🌍 **Localization**: Add support for multiple languages

## 📋 Pull Request Guidelines

- Fill out the PR template completely
- Link to related issues
- Include screenshots for UI changes
- Ensure all tests pass
- Keep PRs focused and atomic
- Update documentation as needed

## 🧪 Testing

```bash
# Everything, from the repository root
npm run verify

# Or one workspace at a time
npm test --workspace @petpal/backend
npm run test:coverage --workspace @petpal/backend

npm test --workspace @petpal/web
```

## 📖 Documentation

- Keep README.md up to date
- Document new APIs in the API section
- Add code comments for complex logic
- Update deployment guides as needed

## 🤝 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers get started
- Celebrate contributions from everyone

## 🔗 Getting Help

- 💬 [GitHub Discussions](https://github.com/your-org/petpal/discussions)
- 🐛 [Issues](https://github.com/your-org/petpal/issues)
- 📧 Create an issue for questions

Thank you for contributing to PetPal! 🐾❤️

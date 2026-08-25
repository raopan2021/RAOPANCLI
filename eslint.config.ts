import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    stylistic: {
      indent: 2,
      quotes: 'single',
    },
    formatters: {
      css: true,
      html: true,
    },
  },
  {
    ignores: [
      'lib/**',
      'node_modules/**',
      'dist/**',
      'docs/.vitepress/cache/**',
      'docs/.vitepress/dist/**',
      // 教程文档：代码块含 `...` 占位符与旧版示例，跳过 lint
      'docs/**/*.md',
      'docs/modules/**',
      'docs/cli/**',
      // GitHub Actions 工作流保持原样，不参与格式化
      '.github/**',
      '.codebuddy/**',
      '.workbuddy/**',
      '.vscode/**',
    ],
  },
  {
    // CLI 脚手架：终端输出是核心功能，放开 console 限制
    rules: {
      'no-console': 'off',
      'node/prefer-global/process': 'off',
    },
  },
  {
    // bin/scripts/test 等非发布产物文件名保持原有命名，不强转 kebab-case
    files: ['bin/**/*.js', 'scripts/**/*.js', 'test/**/*.js'],
    rules: {
      'unicorn/filename-case': 'off',
    },
  },
)

import chalk from 'chalk'
const { log } = console

export default (text, data = "", settings = {}) => {
  const { color = 'blue', inverse = false, error = false } = settings
  data = data || ''
  log(inverse
    ? chalk.inverse[!error ? color : 'red'](text + ' ' + data)
    : chalk[!error ? color : 'red'](text + ' ' + data))
}

// publish to GitHub pages
const ghpages = require('gh-pages')

ghpages.publish('dist', {
    remote: 'origin'
  }, function(err) {
  console.error("Failed", err)
})
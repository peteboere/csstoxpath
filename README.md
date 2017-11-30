[![Build Status](https://travis-ci.org/peteboere/csstoxpath.svg?branch=master)](https://travis-ci.org/peteboere/csstoxpath)

## CSS to XPath

Converts CSS selectors to equivalent XPath (see test.js for example usage).


### Unsupported selectors

These may be supported at a later date:

* `nth-last-child`
* `:lang()`

As far as I'm aware the following cannot be implemented in XPath:

* `*-of-type`

The following are excluded as they can only be partially supported (XPath only matches static attributes):

* `:checked`
* `:disabled`
* `:enabled`
* `:required`

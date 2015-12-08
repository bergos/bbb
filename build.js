var fs = require('fs')
var iconv = require('iconv-lite')

var minify = true
var dateRegex = /\d\d\d\d-\d\d-\d\d/

var date = function (string) {
  var matches = dateRegex.exec(string)

  if (!matches) {
    return ''
  }

  return matches[0]
}

var erstes = iconv.decode(fs.readFileSync('downloads/Gemeinden_erstesFoerderverfahren.csv'), 'win1252')

erstes = erstes
  .split('\r\n')
  .filter(function (line, index) {
    return index !== 0 && line.trim() !== ''
  })
  .map(function (line) {
    var cells = line.split(';')

    return {
      id: cells[0],
      municipality: cells[1],
      administration: cells[2],
      district: cells[3],
      started: '2008-01-01',
      finished: '2013-01-01'
    }
  })

var zweites = iconv.decode(fs.readFileSync('downloads/BBZ_Links_export.csv'), 'win1252')

zweites = zweites
  .split('\r\n')
  .filter(function (line, index) {
    return index !== 0 && line.trim() !== ''
  })
  .map(function (line) {
    var cells = line.split(';')

    cells[5] = date(cells[5])
    cells[15] = date(cells[15])
    cells[17] = date(cells[17])

    return {
      id: cells[1],
      administration: cells[2],
      district: cells[3],
      municipality: cells[4],
      started: cells[5],
      finished: cells[15] || cells[17]
    }
  })

var verfahren = erstes.concat(zweites)

if (minify) {
  verfahren = JSON.stringify(verfahren)
} else {
  verfahren = JSON.stringify(verfahren, null, ' ')
}

fs.writeFileSync('public/verfahren.json', verfahren)

var gemeinden = JSON.parse(fs.readFileSync('downloads/gemeinden.geojson').toString())

var roundArray = function (array) {
  if (!Array.isArray(array)) {
    return Math.round(array * 1000) / 1000
  } else {
    return array.map(function (item) {
      return roundArray(item)
    })
  }
}

gemeinden.features = gemeinden.features.map(function (gemeinde) {
  gemeinde.geometry.coordinates = gemeinde.geometry.coordinates.map(function (coordinate) {
    return roundArray(coordinate)
  })

  gemeinde.properties.id = gemeinde.properties.RS.substr(0, 5) + gemeinde.properties.RS.substr(9, 3)

  return gemeinde
})

if (minify) {
  gemeinden = JSON.stringify(gemeinden)
} else {
  gemeinden = JSON.stringify(gemeinden, null, ' ')
}

fs.writeFileSync('public/gemeinden.geojson', gemeinden)

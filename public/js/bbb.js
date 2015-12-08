/* global _, $, L */

var map = L.map('map').setView([48.716667, 12.433333], 12)

L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
  maxZoom: 18
}).addTo(map)

var config = {
  startDate: new Date('2013-01-01'),
  endDate: new Date()
}

var data = {}

var filters = {
  administrations: [],
  districts: [],
  startDate: config.startDate,
  endDate: config.endDate
}

var layer = null
var layerUpdate = false

var loadMunicipalities = function (callback) {
  $.getJSON('gemeinden.geojson', function (municipalities) {
    data.municipalities = municipalities

    data.municipalitieIds = municipalities.features.map(function (municipality) {
      return municipality.properties.id
    })

    callback()
  })
}

var loadActions = function (callback) {
  $.getJSON('verfahren.json', function (json) {
    data.actions = json.map(function (action) {
      action.started = action.started ? new Date(action.started) : new Date('2100-01-01')
      action.finished = action.finished ? new Date(action.finished) : new Date('2100-01-01')

      return action
    })

    callback()
  })
}

var asOptionsHtml = function (options) {
  return options
    .map(function (option) {
      return '<option>' + option + '</option>'
    })
    .join()
}

var filterActionDate = function (action) {
  if (action.finished < filters.startDate) {
    return false
  }

  if (action.finished > filters.endDate) {
    return false
  }

  return true
}

var filterAction = function (action) {
  if (filters.administrations.length !== 0 && filters.administrations.indexOf(action.administration) === -1) {
    return false
  }

  if (filters.districts.length !== 0 && filters.districts.indexOf(action.district) === -1) {
    return false
  }

  return filterActionDate(action)
}

var createOptions = function (property, empty) {
  var options = _.uniq(
    data.actions
      .map(function (action) {
        return action[property]
      })
      .sort(function (a, b) {
        return a.localeCompare(b)
      })
  )

  if (empty) {
    options = [''].concat(options)
  }

  return options
}

var updateFilterOptions = function () {
  $('#administration-filter').children().remove()
  $('#district-filter').children().remove()

  $('#administration-filter').append(asOptionsHtml(createOptions('administration')))
  $('#district-filter').append(asOptionsHtml(createOptions('district', true)))

  $('#administration-filter').val('Niederbayern').trigger('change')
}

var updateFilter = function (name) {
  return function (event) {
    var values = []

    $('option:checked', event.target).each(function (index, option) {
      values.push($(option).val())
    })

    if (values.length === 1 && values[0] === '') {
      filters[name] = []
    } else {
      filters[name] = values
    }

    updateLayer()
  }
}

var updateLayer = function () {
  layerUpdate = true
}

var processLayer = function () {
  if (!layerUpdate) {
    return
  }

  layerUpdate = false

  var ids = data.actions
    .filter(filterAction)
    .map(function (action) {
      return action.id
    })

  if (layer) {
    map.removeLayer(layer)
  }

  layer = L.geoJson(data.municipalities, {
    filter: function (feature) {
      return ids.indexOf(feature.properties.id) !== -1
    },
    style: function () {
      return {
        color: '#209010',
        opacity: 1.0
      }
    }
  }).addTo(map)
}

setInterval(processLayer, 500)

$('#time-range-filter').slider({
  min: config.startDate.valueOf(),
  max: config.endDate.valueOf(),
  step: 7 * 60 * 60 * 24 * 1000,
  value: [config.startDate.valueOf(), config.endDate.valueOf()],
  formatter: function (values) {
    if (Array.isArray(values)) {
      return values.map(function (value) {
        return (new Date(parseFloat(value))).toLocaleDateString()
      }).join(' bis ')
    } else {
      return (new Date(parseFloat(values))).toLocaleDateString()
    }
  }
})

loadMunicipalities(function () {
  loadActions(function () {
    $('#administration-filter').change(updateFilter('administrations'))
    $('#district-filter').change(updateFilter('districts'))

    $('#time-range-filter').change(function (event) {
      filters.startDate = new Date(event.value.newValue[0])
      filters.endDate = new Date(event.value.newValue[1])

      updateLayer()
    })

    updateFilterOptions()
    updateLayer()
  })
})

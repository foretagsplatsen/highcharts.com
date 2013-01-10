/* ****************************************************************************
 * Start Waterfall series code                                                *
 *****************************************************************************/

// 1 - set default options
defaultPlotOptions.waterfall = merge(defaultPlotOptions.column, {
});

// 2 - Create the series object
seriesTypes.waterfall = extendClass(seriesTypes.column, {
	type: 'waterfall',

	upColorProp: 'fill',

	pointArrayMap: ['y', 'low'],

	pointValKey: 'y',

	/**
	 * Translate data points from raw values
	 */
	translate: function () {
		var series = this,
			sum = 0,
			sumStart = 0,
			subSum = 0,
			subSumStart = 0,
			points,
			point,
			shapeArgs,
			previous,
			edges,
			len,
			i;

		// run column series translate
		seriesTypes.column.prototype.translate.apply(this);

		points = this.points;

		for (i = 0, len = points.length; i < len; i++) {

			point = points[i];
			shapeArgs = point.shapeArgs;

			// set new intermediate sum values after reset
			if (subSumStart === null) {
				subSumStart = point;
				subSum = 0;
			}

			// sum only points with value, not intermediate or total sum
			if (point.y && !point.isSum && !point.isIntermediateSum) {
				sum += point.y;
				subSum += point.y;
			}

			// if previous point is specified we start from its end value
			if (previous) {

				// calculate sum points
				if (point.isSum || point.isIntermediateSum) {

					if (point.isIntermediateSum) {
						edges = series.getSumEdges(subSumStart, points[i - 1]);

						point.y = subSum;
						subSumStart = null;

					} else {
						edges = series.getSumEdges(sumStart, points[i - 1]);
						point.y = sum;
					}

					shapeArgs.y = point.plotY = edges[1];
					shapeArgs.height = edges[0] - edges[1];

				// calculate other (up or down) points based on y value
				} else {
					if (point.y >= 0) {
						shapeArgs.y = previous = previous - shapeArgs.height;

					} else {
						shapeArgs.y = previous;
						previous += shapeArgs.height;
					}
				}

				// otherwise we start from 0
			} else {
				subSumStart = sumStart = point;
				previous = shapeArgs.y;
			}
		}
	},

	/**
	 * Call default processData then override yData to reflect waterfall's extremes on yAxis
	 */
	processData: function (force) {
		Series.prototype.processData.call(this, force);

		var series = this,
			options = series.options,
			yData = series.yData,
			length = yData.length,
			prev,
			curr,
			subSum,
			sum,
			i;

		prev = sum = subSum = options.threshold;

		for (i = 0; i < length; i++) {
			curr = yData[i];

			// curr[1] and curr[2] keep information about sum points
			if (curr[1] === true) {
				yData[i] = [sum, prev];
			} else if (curr[2] === true) {
				yData[i] = [subSum, prev];
				subSum = prev;
			} else {
				yData[i] = [prev, prev + curr[0]];
			}

			// yData[i] has this format now: [low, y]
			prev = yData[i][1];
		}
	},

	/**
	 * Return [y, low] array, if low is not defined, it's replaced with null for further calculations
	 */
	toYData: function (pt) {
		return [pt.y, pt.isSum, pt.isIntermediateSum];
	},

	/**
	 * Postprocess mapping between options and SVG attributes
	 */
	getAttribs: function () {
		seriesTypes.column.prototype.getAttribs.apply(this, arguments);

		var series = this,
			options = series.options,
			stateOptions = options.states,
			upColor = options.upColor || series.color,
			hoverColor = Highcharts.Color(upColor).brighten(0.1).get(),
			seriesDownPointAttr = merge(series.pointAttr),
			upColorProp = series.upColorProp;

		seriesDownPointAttr[''][upColorProp] = upColor;
		seriesDownPointAttr.hover[upColorProp] = stateOptions.hover.upColor || hoverColor;
		seriesDownPointAttr.select[upColorProp] = stateOptions.select.upColor || upColor;

		each(series.points, function (point) {
			if (point.y > 0 && !point.color) {
				point.pointAttr = seriesDownPointAttr;
				point.color = upColor;
			}
		});
	},

	/**
	 * Draw columns' connector lines
	 */
	getGraphPath: function () {

		var data = this.data,
			length = data.length,
			lineWidth = this.options.lineWidth + this.options.borderWidth,
			normalizer = mathRound(lineWidth) % 2 / 2,
			path = [],
			M = 'M',
			L = 'L',
			prevArgs,
			pointArgs,
			i,
			d;

		for (i = 1; i < length; i++) {
			pointArgs = data[i].shapeArgs;
			prevArgs = data[i - 1].shapeArgs;

			d = [
				M,
				prevArgs.x + prevArgs.width, prevArgs.y + normalizer,
				L,
				pointArgs.x, prevArgs.y + normalizer
			];

			if (data[i - 1].y < 0) {
				d[2] += prevArgs.height;
				d[5] += prevArgs.height;
			}

			path = path.concat(d);
		}

		return path;
	},

	/**
	 * Return array of top and bottom position for sum column based on given edge points
	 */
	getSumEdges: function (pointA, pointB) {
		var valueA,
			valueB,
			tmp;

		valueA = pointA.y >= 0 ? pointA.shapeArgs.y + pointA.shapeArgs.height : pointA.shapeArgs.y;
		valueB = pointB.y >= 0 ? pointB.shapeArgs.y : pointB.shapeArgs.y + pointB.shapeArgs.height;

		if (valueB > valueA) {
			tmp = valueA;
			valueA = valueB;
			valueB = tmp;
		}

		return [valueA, valueB];
	},

	/**
	 * Place sums' dataLabels on the top of column regardles of its value
	 */
	alignDataLabel: function (point, dataLabel, options,  alignTo, isNew) {
		var dlBox;

		if (point.isSum || point.isIntermediateSum) {
			dlBox = point.dlBox || point.shapeArgs;

			if (dlBox) {
				alignTo = merge(dlBox);
			}

			alignTo.height = 0;
			options.verticalAlign = 'bottom';
			options.align = pick(options.align, 'center');

			Series.prototype.alignDataLabel.call(this, point, dataLabel, options, alignTo, isNew);
		} else {
			seriesTypes.column.prototype.alignDataLabel.apply(this, arguments);
		}
	},

	drawGraph: Series.prototype.drawGraph
});

/* ****************************************************************************
 * End Waterfall series code                                                  *
 *****************************************************************************/
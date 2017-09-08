define([
  '../chart/line_chart',
  '../util/utils',
  'ng!$q',
], (lineChart, utils, $q) => {
  return {
    /**
     * createCube - create HyperCubes
     *
     * @param {Object} app    reference to app
     * @param {Object} $scope angular $scope
     *
     * @return {Null} null
     */
     createCube(app, $scope) {
       const layout = $scope.layout;

       // Display loader
       // utils.displayLoader($scope.extId);

       const dimension = utils.validateDimension(layout.props.dimensions[0]);

       // Set definitions for dimensions and measures
       const dimensions = [{ qDef: { qFieldDefs: [dimension] } }];

       const meaLen = layout.props.measures.length;
       $scope.rowsLabel = ['(Intercept)', (layout.props.measures[1].label != '') ? layout.props.measures[1].label : utils.validateMeasure(layout.props.measures[0]) ]; // Label for dimension values
       let params = `${utils.validateMeasure(layout.props.measures[0])} as mea0, ${utils.validateMeasure(layout.props.measures[1])} as mea1`;
       let meaList = 'mea0 ~ mea1';
       let dataType = 'NN';

       for (let i = 2; i < meaLen; i++) {
         const mea = utils.validateMeasure(layout.props.measures[i]);
         if (mea.length > 0) {
           const param = `,${mea} as mea${i}`;
           params += param;
           meaList += ` + mea${i}`;
           dataType += 'N';

           $scope.rowsLabel.push(utils.validateMeasure(layout.props.measures[i]));
         }
       }

       // Split dataset into training and test datasets
       const splitData = utils.splitData(layout.props.splitDataset, layout.props.splitPercentage, meaLen);

       const measures = [
         {
           qDef: {
             qDef: `R.ScriptEvalExStr('${dataType}','library(jsonlite); ${splitData} lm_result <- glm(${meaList}, data=training_data, family=binomial(link="logit"));
             res<-toJSON(coef(summary(lm_result)));res;',${params})`,
           },
         },
         {
           qDef: {
             qLabel: '-',
             qDef: '', // Dummy
           },
         },
         {
           qDef: {
             qLabel: '-',
             qDef: '', // Dummy
           },
         },
         {
           qDef: {
             qLabel: '-',
             qDef: '', // Dummy
           },
         },
         {
           qDef: {
             qLabel: '-',
             qDef: '', // Dummy
           },
         },
       ];

       $scope.backendApi.applyPatches([
         {
           qPath: '/qHyperCubeDef/qDimensions',
           qOp: 'replace',
           qValue: JSON.stringify(dimensions),
         },
         {
           qPath: '/qHyperCubeDef/qMeasures',
           qOp: 'replace',
           qValue: JSON.stringify(measures),
         },
       ], false);

       $scope.patchApplied = true;
       return null;
     },
    /**
    * drawChart - draw chart with updated data
    *
    * @param {Object} $scope angular $scope
    *
    * @return {Object} Promise object
    */
    drawChart($scope) {
      const defer = $q.defer();
      const layout = $scope.layout;

      const dimension = utils.validateDimension(layout.props.dimensions[0]);
      const requestPage = [{
        qTop: 0,
        qLeft: 0,
        qWidth: 6,
        qHeight: 1,
      }];

      $scope.backendApi.getData(requestPage).then((dataPages) => {
        const measureInfo = $scope.layout.qHyperCube.qMeasureInfo;

        // Display error when all measures' grand total return NaN.
        if (dataPages[0].qMatrix[0][1].qText.length === 0 || dataPages[0].qMatrix[0][1].qText == '-') {
          utils.displayConnectionError($scope.extId);
        } else {
          const palette = utils.getDefaultPaletteColor();
          const result = JSON.parse(dataPages[0].qMatrix[0][1].qText);

          const x = [];
          const array = [];
          const all = [];
          $.each(result, (key, value) => {
            x.push(value[0]);
            array.push(value[1]);
            all.push(Math.abs(value[0] + value[1]));
            all.push(Math.abs(value[0] - value[1]));
          });

          const maxVal = Math.max.apply(null, all);

          const chartData = [
            {
              x: x,
              y: $scope.rowsLabel,
              name: 'Coefficients plot',
              error_x: {
                type: 'data',
                symmetric: false,
                array: array,
                arrayminus: array,
                thickness: layout.props.borderWidth,
                color: (layout.props.colors) ? `rgba(${palette[3]},1)` : `rgba(${palette[layout.props.colorForMain]},1)`,
              },
              type: 'scatter',
              mode: 'markers',
              marker: {
                color: (layout.props.colors) ? `rgba(${palette[3]},1)` : `rgba(${palette[layout.props.colorForMain]},1)`,
                size: layout.props.pointRadius,
              },
            }
          ];

          const customOptions = {
            showlegend: $scope.layout.props.showLegend,
            xaxis: {
              showgrid: $scope.layout.props.xScale,
              side: $scope.layout.props.xAxisPosition,
              range: [(maxVal * 1.1) * -1, (maxVal * 1.1)],
            },
            yaxis: {
              showgrid: $scope.layout.props.yScale,
              side: $scope.layout.props.yAxisPosition,
              autorange: 'reversed',
              range: [-1, ($scope.rowsLabel.length)],
            },
            separators: utils.getSeparators($scope, 0),
            dragmode: 'select',
            margin: {
              r: ($scope.layout.props.yAxisPosition == 'right') ? 80 : 10,
              l: ($scope.layout.props.yAxisPosition == 'left') ? 80 : 10,
              t: ($scope.layout.props.xAxisPosition == 'top') ? 80 : 10,
              b: ($scope.layout.props.xAxisPosition == 'bottom') ? 80 : 10,
            },
          };

          // Set HTML element for chart
          $(`.advanced-analytics-toolsets-${$scope.extId}`).html(`<div id="aat-chart-${$scope.extId}" style="width:100%;height:100%;"></div>`);

          lineChart.draw($scope, chartData, `aat-chart-${$scope.extId}`, customOptions);

        }
        return defer.resolve();
      });
      return defer.promise;
    },
  };
});

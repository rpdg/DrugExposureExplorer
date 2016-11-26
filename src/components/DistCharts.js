import './DistCharts.css';
import React, { Component } from 'react';
import { Button, Panel, Modal, Checkbox, 
          OverlayTrigger, Tooltip,
          FormGroup, Radio,
          Row, Col,
      } from 'react-bootstrap';
var d3 = require('d3');
import _ from 'supergroup';
import * as util from '../utils';
import {distfetch} from '../appData';

/* @class DistSeriesContainer
 *  data fetcher for DistSeries, a series of TimeDists
 *  there may be more items in each distribution than
 *  pixels of height to represent each with its own
 *  line, so items are grouped into ntiles.
 *
 *  need to know the number of ntiles for data fetching,
 *  but the number of ntiles needed is the pixel height
 *  of chart area...so, kinda weird. would like to set
 *  display param like height where the chart is 
 *  defined, but can't -- chart height based on ntiles
 *
 */
export class DistSeriesContainer extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      dists: null,
      ntiles: 120,
    };
  }
  componentDidMount() {
    // change to general params
    const {concept_id, bundle, maxgap} = this.props;
    this.fetchDists(concept_id, bundle, maxgap);
  }
  componentWillReceiveProps(nextProps) {
    const {concept_id, bundle, maxgap} = nextProps;
    if (nextProps.concept_id !== this.props.concept_id ||
        nextProps.maxgap !== this.props.maxgap ||
        nextProps.bundle !== this.props.bundle ||
        nextProps.ntileOrder !== this.props.ntileOrder)
      this.fetchDists(concept_id, bundle, maxgap);
  }
  fetchDists(concept_id, bundle, maxgap) {
    this.setState({dists: null});
    let params = {
            ntiles: this.state.ntiles,
            concept_id: concept_id,
            bundle, // exp, era, single
            //ntileOrder: 'duration',
            ntileOrder: 'gap',
          };
    if (bundle === 'era') {
      params.maxgap = maxgap;
    }
    let gaps = distfetch(params);
    params.ntileOrder = 'duration';
    let exps = distfetch(params);
    Promise.all([gaps, exps])
      .then(function(recs) {
        let bundleCol;
        if (params.bundle === 'exp') {
          bundleCol = 'exp_num';
        } else if (params.bundle === 'era') {
          bundleCol = 'era_num';
        } else {
          throw new Error("not handling yet");
        }
        let dists = _.supergroup(_.flatten(recs), [bundleCol,'ntileOrder','ntile']);
        this.setState({dists});
      }.bind(this))
  }
  render() {
    const {concept, concept_id, bundle, maxgap} = this.props;
    const {dists, ntiles} = this.state;
    if (dists) {
      return <DistSeries  concept={concept}
                          concept_id={concept_id}
                          ntiles={ntiles}
                          dists={dists}
                          maxgap={maxgap}
                          loading={maxgap}
                          bundle={bundle}
                          />
    } else {
      return <div className="waiting">Waiting for exposure data...</div>;
    }
  }
}
/* @class DistSeries
 *  a series of TimeDists. read description of container above
 *
 *  each line in a TimeDist represents an ntile of data items.
 *  so far, just using ntile avg, but may later use
 *  min and max.
 *
 *  not sure if this component will have more general use, but
 *  writing it for showing days_supply and gap distributions
 *  for 1st, 2nd, 3rd, etc exposures to a drug.
 *
 *  trying to aim at making component general, but for now
 *  it's tied in various ways to specific use case 
 *
 *  1st exposure will always have the largest count, but
 *  for data query simplicity, getting the same number of
 *  ntiles for all exposures, so need to scale the others
 *  appropriately to show the lower counts (maxCnt is 1st
 *  exposure count)
 */
export class DistSeries extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      useFullHeight: false,
      DistChartType: 'DistBars',
      ChartTypes : {
        DistBars, CumulativeDistFunc,
      }
    };
  }
  render() {
    const {dists, ntiles, maxgap, bundle} = this.props;
    const {useFullHeight, DistChartType, ChartTypes} = this.state;
    console.log(bundle);
    let Dists = dists.map((dist,i) => {
      let bundleType;
      switch (bundle) {
        case 'exp':
          bundleType = 'Plain exposure'; break;
        case 'era':
          bundleType = 'Era'; break;
        case 'single':
          bundleType = 'Single era/patient'; break;
      }
      return <ExpGapDist
                key={i}
                distNum={i+1}
                dist={dist}
                allDists={dists}
                useFullHeight={useFullHeight}
                DistChart={ChartTypes[DistChartType]}
                bundle={bundle}
                bundleType={bundleType}
                />;
    });
    return  <div>
              <div>
                Gaps and exposure durations for up to {' '}
                {dists.length} {' '}
                {typeof maxgap === "undefined"
                    ? 'raw exposures'
                    : `eras based of max gap of ${maxgap}`}
                <Checkbox onChange={
                            ()=>this.setState({useFullHeight:!this.state.useFullHeight})
                          } inline={false}>
                  Use full height
                </Checkbox>
                  <Radio inline 
                    checked={DistChartType==='DistBars'}
                    value={'DistBars'}
                    onChange={this.onDistChartChange.bind(this)}
                  >
                    Distribution bars (kinda weird, but I like it)
                  </Radio>
                  {' '}
                  <Radio inline
                    checked={DistChartType==='CumulativeDistFunc'}
                    value={'CumulativeDistFunc'}
                    onChange={this.onDistChartChange.bind(this)}
                  >
                    Cumulative Distribution Function
                  </Radio>
                  {' '}
                  <Radio inline
                    title="blah blah blah"
                    disabled={true}
                    checked={DistChartType==='DensityEstimation'}
                    //checked={true}
                    value={'DensityEstimation'}
                    onChange={this.onDistChartChange.bind(this)}
                  >
                    Density Estimation
                  </Radio>
                </div>
              {Dists}
              <div style={{clear:'both'}} />
            </div>;
  }
  /*
  renderOLD() {
    const {dists, ntiles, maxgap} = this.props;
    const {useFullHeight, DistChartType, ChartTypes} = this.state;
    const maxBars = ntiles; // max in series (1st has max)
    let maxCnt = _.sum( dsgpDist
                  .filter(d=>d.exp_num === 1)
                  .map(d=>d.count));
    let dists = [];
    for (let i=1; i<_.max(dsgpDist.map(d=>d.exp_num)); i++) {
      const distRecs = dsgpDist.filter(d=>d.exp_num === i);
      let ekey = `exp_${i}`;
      dists.push(<ExpGapDist
                    key={ekey}
                    exp_num={i}
                    type={typeof maxgap === "undefined"
                            ? 'Exposure'
                            : 'Era'}
                    distRecs={distRecs}
                    maxCnt={maxCnt}
                    maxBars={maxBars}
                    useFullHeight={useFullHeight}
                    DistChart={ChartTypes[DistChartType]}
                    />);
      /*
      let gkey = `gap_${i}`;
      dists.push(<TimeDist
                    key={gkey}
                    numbers={
                      gaps
                        .filter(d=>d.exp_or_gap_num === i)
                        .map(d=>d.avg)
                    }
                    maxCnt={maxCnt}
                    n={_.sum( gaps
                        .filter(d=>d.exp_or_gap_num === i)
                        .map(d=>d.count)
                        )}
                    width={timeDistWidth}
                    height={timeDistHeight} 
                    />);
      * /
    }
    return  <div>
              Gaps and exposure durations for up to {' '}
              {dists.length} {' '}
              {typeof maxgap === "undefined"
                  ? 'raw exposures'
                  : `eras based of max gap of ${maxgap}`}
              <Checkbox onChange={
                          ()=>this.setState({useFullHeight:!this.state.useFullHeight})
                        } inline={false}>
                Use full height
              </Checkbox>
                <Radio inline 
                  checked={DistChartType==='DistBars'}
                  value={'DistBars'}
                  onChange={this.onDistChartChange.bind(this)}
                >
                  Distribution bars (kinda weird, but I like it)
                </Radio>
                {' '}
                <Radio inline
                  checked={DistChartType==='CumulativeDistFunc'}
                  value={'CumulativeDistFunc'}
                  onChange={this.onDistChartChange.bind(this)}
                >
                  Cumulative Distribution Function
                </Radio>
                {' '}
                <Radio inline
                  title="blah blah blah"
                  disabled={true}
                  checked={DistChartType==='DensityEstimation'}
                  //checked={true}
                  value={'DensityEstimation'}
                  onChange={this.onDistChartChange.bind(this)}
                >
                  Density Estimation
                </Radio>
              {dists}
            </div>;
  }
  */
  onDistChartChange(e) {
    this.setState({
      DistChartType: e.currentTarget.value,
    });
  }
}
/* @class ExpGapDist
 *  TimeDist of gap days leading up to days_supply
 *
 *  not sure why counts of gaps and exps don't total
 *  the same, so will probably have to fix this, but for
 *  now treating them as if they do
 *
 */
export class ExpGapDist extends Component {
  constructor(props) {
    super(props);
    this.state = { 
    };
  }
  render() {
    const {dist, allDists, distNum, bundleType, useFullHeight, DistChart} = this.props;

    let chart1 = '', chart2 = '';
    let gaps = '';
    if (dist.lookup('gap')) {
      gaps = <DistChart
                dist={dist.lookup('gap')}
                allDists={allDists}
                distNum={distNum}
                getX={d=>d.avg||0}
                getY={(d,i)=>i}
              />;
    }
    return (<div className="expgapdist">
              <Row style={{margin:0}}>
                <Col md={6} style={{padding:0}} className="gapdist">
                  Gaps<br/>
                  {distNum === 1 
                    ? ` (no gap preceding first ${bundleType.toLowerCase()})` 
                    : gaps}
                </Col>
                <Col md={6} style={{padding:0}} className="distbars">
                  Duration<br/>
                  <DistChart
                      dist={dist.lookup('duration')}
                      allDists={allDists}
                      distNum={distNum}
                      getX={d=>d.avg||0}
                      getY={(d,i)=>i}
                    />
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  {bundleType} {distNum}
                </Col>
              </Row>
            </div>);
  }
}
  /*
  setYScale() {
    const {dist, allDists, distNum, type, useFullHeight, DistChart} = this.props;
    const {lo, gapChartWidth, expChartWidth, expgapdistdiv} = this.state;


    const distCnt = dist.aggregate(_.sum, 'count');
    let yScaling = distCnt / maxCnt;
    if (useFullHeight) {
      yScaling = 1;
    }
    let yrange = [lo.chartHeight() * yScaling, 0];

    let ydomain = [0, distCnt];

    let y = d3.scaleLinear().domain(ydomain).range(yrange);
    let yAxis = d3.axisLeft()
                .scale(y)
                .ticks(3)
    if (expgapdistdiv) {
      d3.select(expgapdistdiv).select('svg>g.y-axis').call(yAxis);
    }
    ydomain = [0, dist.children.length];
    y.domain(ydomain);
    return y;
  }
  */
export class SmallChart extends Component {
  constructor(props) {
    super(props);
    let {svgLayoutSettings, width=150, height=150} = props;
    const layoutDefaults =
                    { top: { margin: { size: 7}, },
                      bottom: { margin: { size: 20}, },
                      left: { margin: { size: 30}, },
                      right: { margin: { size: 9}, },
                    };
    let lo = new util.SvgLayout(
              width, height,
              _.merge(layoutDefaults, svgLayoutSettings));

    this.state = {lo, };
  }
  componentDidMount(recs) {
    const {distNum, getX, getY} = this.props;
    const {lo} = this.state;
    const {clientWidth, clientHeight} = this.svg;
    let [width, height] = [clientWidth, clientHeight];
    lo.w(width);
    lo.h(height);
    let yDomain = this.props.yDomain || [recs.length, 0];
    let x = d3.scaleLinear()
              .range([0, width])
              // not general:
              .domain([_.min([_.min(recs.map(getX)), 0]), _.max(recs.map(getX))]);
    let xAxis = d3.axisBottom()
                .ticks(2)
                .scale(x)
    d3.select(this.xAxisG).select('g.x-axis').call(xAxis);


    /*
    const distCnt = dist.aggregate(_.sum, 'count');
    let yScaling = distCnt / maxCnt;
    if (useFullHeight) {
      yScaling = 1;
    }
    let yrange = [lo.chartHeight() * yScaling, 0];

    let ydomain = [0, distCnt];

    let y = d3.scaleLinear().domain(ydomain).range(yrange);
    let yAxis = d3.axisLeft()
                .scale(y)
                .ticks(3)
    if (expgapdistdiv) {
      d3.select(expgapdistdiv).select('svg>g.y-axis').call(yAxis);
    }
    ydomain = [0, dist.children.length];
    y.domain(ydomain);
    */
    let y = d3.scaleLinear()
              .range([lo.chartHeight(), 0])
              .domain(yDomain);
    let yAxis = d3.axisLeft()
                .ticks(2)
                .scale(y)
    this.setState({ x, y, lo, xAxis, yAxis });
    //console.log(lo,x,y);
  }
  componentDidUpdate() {
    const {lo, y, x, xAxis, yAxis} = this.state;
    d3.select(this.xAxisG).call(xAxis);
    d3.select(this.yAxisG).call(yAxis);
  }
  render(insides) {
    const {lo, y, x} = this.state;
    //console.log(this.state);
    //if (y) debugger;
    return (
              <svg  width={lo.w()}
                    height={lo.h()}
                    ref={(svg) => { 
                      this.svg = svg;
                    }}
                >
                <g className="y-axis"
                    ref={(yAxisG) => this.yAxisG = yAxisG}
                    transform={
                      `translate(${lo.zone('left')},${lo.zone('top')})`
                    } />
                <g className="x-axis"
                    ref={(xAxisG) => this.xAxisG = xAxisG}
                    transform={
                      `translate(${lo.zone('left')},${lo.chartHeight() + lo.zone('top')})`
                    } />
                <g className="small-chart"
                    transform={
                      `translate(${lo.zone('left')},${lo.zone('top')})`
                    }>
                    {insides}
                </g>
              </svg>
    );
  }
}
export class DistBars extends SmallChart {
  constructor(props) {
    super(props);
  }
  componentDidMount() {
    let {dist} = this.props;
    super.componentDidMount(dist.records);
    //super.componentDidMount();
  }
  render() {
    const {dist, allDists, distNum, getX, getY} = this.props;
    const {x, y } = this.state;

    let bars = '';
    if (x) {
      bars = dist.records.map((rec,i) => {
        return <line  key={i}
                      x1={x(0)} y1={y(i)} 
                      x2={x(getX(rec))} y2={y(i)} 
                      className="bar" />;
      });
    }
    return super.render(
      <g>{bars}</g>
    );
    /*
    return (
                <svg 
                      width={lo.w()} 
                      height={lo.h()}>
                  <g className="y-axis"
                      transform={
                        `translate(${lo.zone('left')},${lo.zone('top')})`
                      } />
                  <g className="x-axis"
                      transform={
                        `translate(${0},${y.range()[0]})`
                      } />
                  <g className="gapdist"
                      transform={
                        `translate(${lo.zone('left')},${lo.zone('top')})`
                      }>
                    <g ref="distbarsg">
                      {gapbars}
                    </g>
                  </g>
                  <g className="expdist"
                      transform={
                        `translate(${lo.zone('left') + expChartWidth},${lo.zone('top')})`
                      }>
                    {bars}
                  </g>
                </svg>
    );
    */
                //<rect x={1} y={1} width={lo.chartWidth()} height={lo.chartHeight()} />
                //<line x1={x(0)} y1={0} x2={x(0)} y2={lo.chartHeight()} className="zero"/>
  }
}
export class CumulativeDistFunc extends Component {
  constructor(props) {
    super(props);
    this.state = { };
  }
  componentDidMount() {
    const {distRecs, maxBars, maxCnt, width, getX, y} = this.props;
    let x = d3.scaleLinear()
              .range([0, width])
              .domain([_.min([_.min(distRecs.map(getX)), 0]), _.max(distRecs.map(getX))]);
    let xAxis = d3.axisBottom()
                .ticks(2)
                .scale(x)
    this.setState({ x, });
    let node = this.refs.distbarsg;
    d3.select(node).select('g.x-axis').call(xAxis);


    const cnt = distRecs.length;
    let data = distRecs.map((d,i) => {
      return {
        x: getX(d) * -1,
        //y: (i+1) / cnt,
        y: -i,
      };
    });
    /*
     * getting code from http://bl.ocks.org/jdittmar/6282869
    var dataLength = data.length;
    for (var i = 0; i < dataLength; i++) {
      data[i].x =  +data[i].x*-1;
      data[i].y = +((i+1)/dataLength);
      dataLookup[data[i].orf]=data[i].x;
    };
    */
    x.domain(d3.extent(data, function(d) { return d.x; })).nice();
    y.domain(d3.extent(data, function(d) { return d.y; })).nice();

    var line = d3.line()
        .x(function(d) { return x(d.x); })
        .y(function(d) { return y(d.y); });
    let color = d3.scaleOrdinal()
                        .range(d3.schemeCategory10);

    d3.select(node).append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line)
        .style("stroke", function(d) { 
          return color("initial"); 
        });
  }
  render() {
    const {distRecs, maxBars, maxCnt, 
            width, y, getX, exp_num} = this.props;
    const {x, xAxis, } = this.state;


    return ( <g ref="distbarsg">
                <g className="x-axis"
                    transform={
                      `translate(${0},${y.range()[0]})`
                    } />
            </g>);
                //<rect x={1} y={1} width={lo.chartWidth()} height={lo.chartHeight()} />
                //<line x1={x(0)} y1={0} x2={x(0)} y2={lo.chartHeight()} className="zero"/>
  }
}

function KDE() {
  // USER DEFINABLE VARIABLES START
  var numHistBins = 10; // number of bins for the histogram
  var calcHistBinsAutmoatic = true; // if true, the number of bins are calculated automatically and
  // numHistBins is overwritten
  var showKDP = true; // show the kernel density plot?
  var bandwith = 4; // bandwith (smoothing constant) h of the kernel density estimator
  var dataFN = "./faithful.json"; // the filename of the data to be visualized


  // USER DEFINABLE VARIABLES END


  var margin = {top: 20, right: 30, bottom: 30, left: 40},
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  // the x-scale parameters
  var x = d3.scale.linear()
      .domain([30, 110])
      .range([0, width]);

  // the y-scale parameters
  var y = d3.scale.linear()
      .domain([0, .15])
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .tickFormat(d3.format("%"));

  var line = d3.svg.line()
      .x(function(d) { return x(d[0]); })
      .y(function(d) { return y(d[1]); });

  // the histogram function
  var histogram;

  var svg = d3.select("body").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // draw the background
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .append("text")
      .attr("class", "label")
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .text("Time between Eruptions (min.)");

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis);


  // draw the histogram and kernel density plot  
  d3.json(dataFN, function(error, faithful) {

      // calculate the number of histogram bins
    if( calcHistBinsAutmoatic == true) {
      numHistBins = Math.ceil(Math.sqrt(faithful.length));  // global variable
    }
  // the histogram function
    histogram = d3.layout.histogram()
      .frequency(false)
      .bins(numHistBins);
    //.bins(x.ticks(500));
    
    var data = histogram(faithful);
    //var kde = kernelDensityEstimator(epanechnikovKernel(7), x.ticks(100));
    var kde = kernelDensityEstimator(epanechnikovKernel(bandwith), x.ticks(100));
    
    //alert("kde is " + kde.toSource());
    
    //console.log(svg.datum(kde(faithful)));

    svg.selectAll(".bar")
        .data(data)
      .enter().insert("rect", ".axis")
        .attr("class", "bar")
        .attr("x", function(d) { return x(d.x) + 1; })
        .attr("y", function(d) { return y(d.y); })
        .attr("width", x(data[0].dx + data[0].x) - x(data[0].x) - 1)
        .attr("height", function(d) { return height - y(d.y); });
    
    // show the kernel density plot
    if(showKDP == true) {
      svg.append("path")
        .datum(kde(faithful))
        .attr("class", "line")
        .attr("d", line);
      }

  });

  function kernelDensityEstimator(kernel, x) {
    return function(sample) {
      return x.map(function(x) {
      //console.log(x + " ... " + d3.mean(sample, function(v) { return kernel(x - v); }));    
      return [x, d3.mean(sample, function(v) { return kernel(x - v); })];
      });
    };
  }

  function epanechnikovKernel(bandwith) {
    return function(u) {
      //return Math.abs(u /= bandwith) <= 1 ? .75 * (1 - u * u) / bandwith : 0;
    if(Math.abs(u = u /  bandwith) <= 1) {
    return 0.75 * (1 - u * u) / bandwith;
    } else return 0;
    };
  }
}

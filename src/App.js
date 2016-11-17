import React, { Component } from 'react';
//import logo from './logo.svg';
import './App.css';
import _ from 'supergroup';
import {DrugRollupContainer, RollupList} from './DrugRollupStats';
//import * as util from './ohdsi.util';

class App extends Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <h2>Drug Rollup Stats</h2>
        </div>
        <div className="App-intro">
					<DrugRollupContainer>
						<RollupList  />
					</DrugRollupContainer>
        </div>
      </div>
    );
  }
}

export default App;
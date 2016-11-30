const IssuesFilterForm = React.createClass({
  getInitialState: function() {
    return {filter:'language', query:''};
  },
  handleSubmit: function(e) {
    e.preventDefault();
    this.props.onSubmit(this);
    e.target.elements[1].value = "";
    return false;
  },
  handleFilterChange: function(e) {
    this.setState({filter: e.target.value});
  },
  handleQueryChange: function(e) {
    this.setState({query: e.target.value});
  },
  render: function() {
    let styleFormBox = { border:'1px solid rgba(0,0,0,0.10)', height:44, lineHeight:'44px', borderRadius:5, overflow:'hidden'};
    let styleSelectFilter = {
      box:{ position:'relative', display:'inline-block', width:'15%', height:'inherit', backgroundColor:'#FAFAFA' },
      select:{ position:'relative', zIndex:'10', height:'100%', padding:'0 10px', paddingRight:10+16, fontSize:'17px', letterSpacing:'2.12px', color:'#4a4a4a' },
      inspector:{ position:'absolute', right:10, top:'50%', marginTop:-3, borderWidth:'6px 4px 0', borderStyle:'solid', borderColor:'transparent', borderTopColor:'#4a4a4a' }
    };
    let styleTextfield = { width:'85%', padding:'0 10px', color:'#3b3b3b' };
    return (
      <form onSubmit={this.handleSubmit}>
        <div style={styleFormBox}>
          <div style={styleSelectFilter.box}>
            <select className="nude" defaultValue={this.state.filter} onChange={this.handleFilterChange} style={styleSelectFilter.select}>
              <option value="label">Label</option>
              <option value="language">Language</option>
            </select>
            <span style={styleSelectFilter.inspector}></span>
          </div>
          <input className="nude" style={styleTextfield} type="text" onChansge={this.handleChange} value={this.state.text} onChange={this.handleQueryChange} />
        </div>
      </form>
    );
  }
});

const Issue = React.createClass({
  getDefaultProps: function() {
    return {data:{}, repo:{}};
  },
  render: function() {
    let styleRow = { paddingBottom:22, borderBottom:'1px solid #e6e6e6' };
    let styleTitle = { marginRight:10, fontSize:20, lineHeight:'1.62em', letterSpacing:'0.1em', color:'#2E84E6', textDecoration:'none' };
    let styleTitleFirstLetter = { fontWeight:'normal' };
    let getStyleLabel = function(bgColor) {
      //https://24ways.org/2010/calculating-color-contrast/
      let r = parseInt(bgColor.substr(0,2), 16);
      let g = parseInt(bgColor.substr(2,2), 16);
      let b = parseInt(bgColor.substr(4,2), 16);
      let yiq = ((r*299)+(g*587)+(b*114))/1000;
      let textColor = (yiq >= 128) ? 'rgba(0,0,0,0.8)' : 'white';
      return { display:'inline-block', height:18, lineHeight:'18px', verticalAlign:'middle', fontSize:12, letterSpacing:'0.9px', fontWeight:'bolder', paddingLeft:5, paddingRight:5, marginRight:4, color:textColor, backgroundColor:'#'+bgColor };
    }
    let styleLabelLanguage = { border:'1px solid #6e6e6e', borderRadius:1, lineHeight:'16px' };
    let styleTimestamp = { textAlign:'right', fontSize:14, fontWeight:'300', color:'#999' }
    let styleDescription = { marginTop:12, paddingRight:'20%', fontSize:15, lineHeight:'19px', fontFamily:'Helvetica Neue', fontWeight:'300', color:'#3C3C3C', letterSpacing:'0.1em', wordWrap:'break-word' }
    let styleRepoInfo = { marginTop:30 }
    let styleRepoName = { fontSize:14, color:'#808080', fontWeight:'bolder', letterSpacing:'0.1em' }
    let styleRepoDescription = { fontSize:14, color:'#999', letterSpacing:'0.1em' }

    let updatedAt = new Date(this.props.data.updated_at);
    let dataUpdatedAt = (updatedAt.getMonth()+1) + ' /' + updatedAt.getDate();
    if (updatedAt.getFullYear() != (new Date()).getFullYear()) dataUpdatedAt = updatedAt.getFullYear() + ' /' + dataUpdatedAt;

    let issueId = this.props.data.id;
    let labelNodes = this.props.data.labels.map(function(labelData) {
      return ( <span key={issueId + labelData.name} style={getStyleLabel(labelData.color)}>{labelData.name}</span> );
    });
    if (this.props.repo.language)
      labelNodes.push(<span key={issueId + 'language'} style={{...getStyleLabel('ffffff'), ...styleLabelLanguage}}>{this.props.repo.language}</span>);
    return (
      <li style={this.props.style}>
        <div style={styleRow}>
          <a href={this.props.data.html_url} target="_blank" className="nude">
            <span className="title">
              <span style={styleTitle} className="word-ellipsis">
                <span style={styleTitleFirstLetter}>{this.props.data.title.substr(0,1)}</span>
                {this.props.data.title.substr(1)}
              </span>
              {labelNodes}
              <span style={{...{display:'inline-block'},...styleTimestamp}} className="issue-date">{dataUpdatedAt}</span>
            </span>


            <div style={styleDescription}>
              <span>{this.props.data.body.substr(0,200)}{this.props.data.body.length > 200 ? '...' : ''}</span>
            </div>
          </a>

          <div style={styleRepoInfo}>
            <a href={this.props.repo.html_url} target="_blank" style={{textDecoration:'none'}}>
              <span style={styleRepoName}>{this.props.repo.name}</span>
              <span style={styleRepoDescription}> - {this.props.repo.description}</span>
            </a>
          </div>
        </div>
      </li>
    );
  }
});

const IssuesFilter = React.createClass({
  getInitialState: function() {
    const throttle = function(callback, wait) {
      var time = Date.now();
      return function() {
        if ((time + wait - Date.now()) < 0) {
          callback();
          time = Date.now();
        }
      }
    }
    window.addEventListener("scroll", throttle(this.handleScroll, 1000));

    return {filters:[], data:[], repos:[], reposMapping:{}, offset:0};
  },
  componentDidMount: function() {
    this.load();
  },
  handleScroll: function() {
    let scrollHeight = $(document).height();
    let scrollPosition = $(window).scrollTop() + $(window).height();

    if (scrollPosition * 2 > scrollHeight) {
      this.load(this.state.offset + 10);
    }
  },
  load: function(offset=0) {
    const HOSTNAME = "//ec2-54-238-189-115.ap-northeast-1.compute.amazonaws.com";
    let groupedFilters = {};
    this.state.filters.forEach(function(filter) {
      let filterName = Object.keys(filter)[0], paramKey;
      if (filter.filter == 'label') paramKey = 'labels';
      else if (filter.filter == 'language') paramKey = 'language';
      if (!groupedFilters[paramKey]) groupedFilters[paramKey] = [];
      groupedFilters[paramKey].push(filter.query);
    })
    let params = Object.keys(groupedFilters).map(function(paramKey) { return (paramKey + '=' + groupedFilters[paramKey].join()); });
    params.push("limit=10");
    params.push("offset=" + offset);

    let apiUrl = HOSTNAME + "/api/issues" + (params.length > 0 ? '?' : '') + params.join('&');
    //console.log('issue loading: ', apiUrl);

    $.getJSON(apiUrl, function(response) {
      let dataIssues = response.result;
      let repoIds = dataIssues.map(function(dataIssue) { return dataIssue.repo_id; });
      if (repoIds.length !== 0) {
        $.getJSON(HOSTNAME + "/api/repos?ids=" + repoIds.join(), function(response) {
          let dataRepos = response.result;
          let reposMapping = this.state.reposMapping;
          let allIssues = this.state.data;
          let allRepos = this.state.repos;

          dataIssues.forEach(function(dataIssue, index) {
            let duplicate = allIssues.find(function(issue) { return issue.id == dataIssue.id });
            if (!duplicate) {
              allIssues.push(dataIssue);
            }
          });

          dataRepos.forEach(function(dataRepo, index) {
            let duplicate = allRepos.find(function(repo) { return repo.id == dataRepo.id });
            if (!duplicate) {
              allRepos.push(dataRepo);
              reposMapping[dataRepo.id] = index;
            }
          });

          this.setState({
            data: allIssues,
            repos: allRepos,
            reposMapping: reposMapping,
            offset: offset
          });
        }.bind(this));
      }
    }.bind(this));
  },
  render: function() {
    let handleFilterSubmit = function(e) {
      let filters = JSON.parse(JSON.stringify(this.state.filters));
      let filtersJson = filters.map(function(filter){ return JSON.stringify(filter); });
      let addFilter = e.state;
      if ( !filtersJson.indexOf(JSON.stringify(addFilter)) >= 0 ) {
        filters.push(addFilter);
        this.setState({data: [], repos: [], reposMapping: {}, filters: filters, offset: 0}, this.load);
      }
    }.bind(this);

    let handleRemoveFilterButtonClick = function(e) {
      let filters = JSON.parse(JSON.stringify(this.state.filters));
      filters.splice(e.currentTarget.value, 1);
      this.setState({data: [], repos: [], reposMapping: {}, filters: filters, offset: 0}, this.load);
    }.bind(this);

    let styleContainer = { width:"96%", maxWidth:960, minHeight:'100vh', margin:"auto", padding:"26px 44px", backgroundColor:"white" };

    let filterNodes = this.state.filters.map(function(filterData, index) {
      let styleFilterNode = { display:'inline-block', marginRight:10, padding:'7px 8px', border:'1px solid #ababab', borderRadius:2 },
          fontFilterNode = { fontSize:'14px', letterSpacing:'1.08px', color:'#4a4a4a' },
          styleRemoveButton = { marginLeft:8, marginRight:-2, padding:2, cursor:'pointer' };
      return (
        <li key={filterData.filter+filterData.query} style={{...styleFilterNode,...fontFilterNode}}>
          <span>{filterData.filter}:{filterData.query}</span>
          <button type="button" className="nude" style={styleRemoveButton} value={index} onClick={handleRemoveFilterButtonClick}><img src="/images/icon_remove.png" /></button>
        </li>
      );
    });

    let dataRows = this.state.data.map(function(data) {
      let repo = this.state.repos[this.state.reposMapping[data.repo_id]];
      return (<Issue key={data.id} data={data} repo={repo} style={{marginTop:36}} />);
    }.bind(this));

    return (
      <div style={styleContainer}>
        <div>
          <IssuesFilterForm onSubmit={handleFilterSubmit} />

          <ul style={{marginTop:10}}>
            {filterNodes}
          </ul>
        </div>

        <main style={{marginTop:60}}>
          <ol>
            {dataRows}
          </ol>
        </main>
      </div>
    );
  }
});

ReactDOM.render(
  <IssuesFilter />,
  document.getElementById('issuesFilterContainer')
);

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as XLSX from 'xlsx';
import './App.css';

function App() {
  const svgRef = useRef();
  const [salesData, setSalesData] = useState([]);

  const colors = {
    'Alex': '#3B82F6',
    'Caroline': '#EF4444',
    'Charles': '#10B981',
    'Charlotte': '#F59E0B',
    'Isabelle': '#8B5CF6',
    'Laurence': '#EC4899',
    'Marvin': '#14B8A6',
    'Olivier': '#F97316',
    'Pascal': '#06B6D4',
    'Paul': '#84CC16',
    'Pierre': '#F43F5E',
    'Victor': '#6366F1',
    'Virginie': '#8B5CF6'
  };

  const data = [
    ['Alex', ['01','03','07','15','26','38','42','43','63']],
    ['Caroline', ['04','05','06','13','83','84']],
    ['Charles', ['67','68','80','88']],
    ['Charlotte', ['09','11','12','30','31','32','34','46','48','65','66','81','82']],
    ['Isabelle', ['2A','2B']],
    ['Laurence', ['14','22','27','29','35','50','56','61','76']],
    ['Marvin', ['44','49','53','72','85']],
    ['Olivier', ['75','77','78','91','92','93','94','95']],
    ['Pascal', ['16','17','19','23','24','33','40','47','64','79','86','87']],
    ['Paul', ['02','08','10','51','52','54','55','57','59','60','62']],
    ['Pierre', ['21','25','39','58','70','71','89','90']],
    ['Victor', ['18','28','36','37','41','45']],
    ['Virginie', ['69','73','74']]
  ];

  useEffect(() => {
    const parsedData = data.map(([name, depts]) => ({
      name,
      departments: depts,
      color: colors[name]
    }));
    setSalesData(parsedData);
    loadMap(parsedData);
  }, []);

  const getDepartmentColor = (code, data) => {
    for (const rep of data) {
      if (rep.departments.includes(code)) {
        return rep.color;
      }
    }
    return '#E5E7EB';
  };

  const getDepartmentRep = (code, data) => {
    for (const rep of data) {
      if (rep.departments.includes(code)) {
        return rep.name;
      }
    }
    return 'Non assigné';
  };

  const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    // Grouper les départements par commercial
    const deptByRep = {};
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0] || !row[1]) continue;
      
      const name = row[0].toString().trim();
      let dept = row[1].toString().trim();
      
      if (dept.match(/^\d{1}$/)) {
        dept = '0' + dept;
      }
      
      if (!deptByRep[name]) {
        deptByRep[name] = [];
      }
      deptByRep[name].push(dept);
    }

    // Créer les données avec couleurs
    const newData = Object.entries(deptByRep).map(([name, depts], idx) => ({
      name,
      departments: depts,
      color: colors[name] || ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16', '#F43F5E', '#6366F1'][idx % 12]
    }));

    setSalesData(newData);
    loadMap(newData);
  };
  reader.readAsArrayBuffer(file);
};

  const loadMap = async (data) => {
    try {
      const geojson = await d3.json('/departements.geojson');
      
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      
      const width = 800;
      const height = 700;
      
      const projection = d3.geoConicConformal()
        .center([2.454071, 46.279229])
        .scale(2800)
        .translate([width / 2, height / 2]);
      
      const path = d3.geoPath().projection(projection);
      
      svg.selectAll('path')
        .data(geojson.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', d => {
          const code = d.properties.code;
          return getDepartmentColor(code, data);
        })
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).attr('opacity', 0.7);
        })
        .on('mouseout', function() {
          d3.select(this).attr('opacity', 1);
        })
        .append('title')
        .text(d => {
          const code = d.properties.code;
          const name = d.properties.nom;
          return `${name} (${code}) - ${getDepartmentRep(code, data)}`;
        });
      
    } catch (error) {
      console.error('Erreur chargement carte:', error);
    }
  };

  const handleExport = () => {
    const svg = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = 1200;
    canvas.height = 1000;
    
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = 'carte-territoires.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="App">
      <div className="container">
<div className="header">
  <h1>Carte des Territoires Commerciaux - France</h1>
  <div className="button-group">
    <label htmlFor="file-upload" className="import-btn">
      Importer Excel
    </label>
    <input
      id="file-upload"
      type="file"
      accept=".xlsx,.xls"
      onChange={handleFileUpload}
      style={{ display: 'none' }}
    />
    <button onClick={handleExport} className="export-btn">
      Exporter PNG
    </button>
  </div>
</div>
        
        <div className="content">
          <div className="map-container">
            <svg ref={svgRef} width={800} height={700}></svg>
          </div>
          
          <div className="sidebar">
            <h2>Commerciaux</h2>
            <div className="sales-list">
              {salesData.sort((a, b) => a.name.localeCompare(b.name)).map((rep, idx) => (
                <div key={idx} className="sales-card">
                  <div className="sales-header">
                    <div className="color-box" style={{ backgroundColor: rep.color }}></div>
                    <span className="sales-name">{rep.name}</span>
                  </div>
                  <div className="sales-info">
                    <div className="dept-count">{rep.departments.length} départements</div>
                    <div className="dept-list">{rep.departments.sort().join(', ')}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="stats">
              <h3>Statistiques</h3>
              <div>Total commerciaux : {salesData.length}</div>
              <div>Total départements : {salesData.reduce((sum, rep) => sum + rep.departments.length, 0)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
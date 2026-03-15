package com.railway.service;

import com.railway.entity.LineStation;
import com.railway.mapper.LineStationMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class LineStationService {
    
    @Autowired
    private LineStationMapper lineStationMapper;
    
    public List<LineStation> findAll() {
        return lineStationMapper.findAll();
    }
    
    public LineStation findById(Integer id) {
        return lineStationMapper.findById(id);
    }
    
    public List<LineStation> findByLineId(Integer lineId) {
        return lineStationMapper.findByLineId(lineId);
    }
    
    public int save(LineStation lineStation) {
        if (lineStation.getId() == null) {
            return lineStationMapper.insert(lineStation);
        }
        return lineStationMapper.update(lineStation);
    }
    
    public int delete(Integer id) {
        return lineStationMapper.delete(id);
    }
    
    public int count() {
        return lineStationMapper.count();
    }
    
    public List<Map<String, Object>> getLinesSummary() {
        return lineStationMapper.getLinesSummary();
    }
}

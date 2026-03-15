package com.railway.service;

import com.railway.entity.Station;
import com.railway.mapper.StationMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class StationService {
    
    @Autowired
    private StationMapper stationMapper;
    
    public List<Station> findAll() {
        return stationMapper.findAll();
    }
    
    public Station findById(Integer id) {
        return stationMapper.findById(id);
    }
    
    public List<Station> findByName(String name) {
        return stationMapper.findByName(name);
    }
    
    public int save(Station station) {
        if (station.getId() == null) {
            return stationMapper.insert(station);
        }
        return stationMapper.update(station);
    }
    
    public int delete(Integer id) {
        return stationMapper.delete(id);
    }
    
    public int count() {
        return stationMapper.count();
    }
    
    public List<Map<String, Object>> countByType() {
        return stationMapper.countByType();
    }
    
    public int batchInsert(List<Station> stations) {
        return stationMapper.batchInsert(stations);
    }
}

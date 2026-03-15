package com.railway.service;

import com.railway.entity.Train;
import com.railway.mapper.TrainMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class TrainService {
    
    @Autowired
    private TrainMapper trainMapper;
    
    public List<Train> findAll() {
        return trainMapper.findAll();
    }
    
    public Train findById(Integer id) {
        return trainMapper.findById(id);
    }
    
    public int save(Train train) {
        if (train.getId() == null) {
            return trainMapper.insert(train);
        }
        return trainMapper.update(train);
    }
    
    public int delete(Integer id) {
        return trainMapper.delete(id);
    }
    
    public int count() {
        return trainMapper.count();
    }
    
    public List<Map<String, Object>> countByType() {
        return trainMapper.countByType();
    }
    
    public int batchInsert(List<Train> trains) {
        return trainMapper.batchInsert(trains);
    }
}

package com.railway.controller;

import com.railway.entity.Station;
import com.railway.service.StationService;
import com.railway.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stations")
public class StationController {
    
    @Autowired
    private StationService stationService;
    
    @GetMapping
    public Result<List<Station>> list() {
        return Result.success(stationService.findAll());
    }
    
    @GetMapping("/{id}")
    public Result<Station> get(@PathVariable Integer id) {
        Station station = stationService.findById(id);
        if (station == null) {
            return Result.error("站点不存在");
        }
        return Result.success(station);
    }
    
    @GetMapping("/search")
    public Result<List<Station>> search(@RequestParam String name) {
        return Result.success(stationService.findByName(name));
    }
    
    @PostMapping
    public Result<String> save(@RequestBody Station station) {
        stationService.save(station);
        return Result.success("保存成功");
    }
    
    @DeleteMapping("/{id}")
    public Result<String> delete(@PathVariable Integer id) {
        stationService.delete(id);
        return Result.success("删除成功");
    }
    
    @GetMapping("/count")
    public Result<Integer> count() {
        return Result.success(stationService.count());
    }
    
    @GetMapping("/types")
    public Result<?> countByType() {
        return Result.success(stationService.countByType());
    }
}

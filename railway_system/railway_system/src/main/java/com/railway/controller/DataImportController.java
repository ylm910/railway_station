package com.railway.controller;

import com.railway.service.DataImportService;
import com.railway.common.Result;
import com.railway.mapper.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/import")
public class DataImportController {
    
    @Autowired
    private DataImportService importService;
    
    @Autowired
    private PassengerFlowMapper flowMapper;
    
    @Autowired
    private TrainMapper trainMapper;
    
    @Autowired
    private StationMapper stationMapper;
    
    @Autowired
    private LineStationMapper lineStationMapper;
    
    /**
     * 导入CSV数据
     */
    @PostMapping("/csv")
    public Result<Map<String, Object>> importCSV(
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") String dataType,
            @RequestParam(value = "clean", defaultValue = "true") boolean cleanData,
            @RequestParam(value = "validate", defaultValue = "true") boolean validate,
            @RequestParam(value = "clearBefore", defaultValue = "false") boolean clearBefore) {
        
        if (file.isEmpty()) {
            return Result.error("请选择文件");
        }
        
        // 导入前清空表数据
        if (clearBefore) {
            try {
                switch (dataType) {
                    case "trains":
                        trainMapper.deleteAll();
                        break;
                    case "stations":
                        stationMapper.deleteAll();
                        break;
                    case "lines":
                        lineStationMapper.deleteAll();
                        break;
                    case "passengers":
                        flowMapper.deleteAll();
                        break;
                }
            } catch (Exception e) {
                System.out.println("清空表数据失败: " + e.getMessage());
            }
        }
        
        Map<String, Object> result = importService.importCSV(file, dataType, cleanData, validate);
        
        if ((boolean) result.get("success")) {
            return Result.success(result);
        } else {
            return Result.error((String) result.get("message"));
        }
    }
}
